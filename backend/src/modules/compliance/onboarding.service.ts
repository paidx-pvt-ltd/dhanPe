import { KYCStatus, User } from '@prisma/client';

export type OnboardingStepId =
  | 'MOBILE_VERIFICATION'
  | 'PAN_VERIFICATION'
  | 'PROFILE_COMPLETION'
  | 'KYC_VERIFICATION'
  | 'BENEFICIARY_SETUP'
  | 'READY';

export type OnboardingStepStatus = {
  id: OnboardingStepId;
  label: string;
  completed: boolean;
  required: boolean;
};

export class OnboardingService {
  resolve(user: User, beneficiaryCount: number) {
    const profileComplete = this.isProfileComplete(user);
    const steps: OnboardingStepStatus[] = [
      {
        id: 'MOBILE_VERIFICATION',
        label: 'Mobile verification',
        completed: user.isMobileVerified,
        required: true,
      },
      {
        id: 'PAN_VERIFICATION',
        label: 'PAN verification',
        completed: user.panVerified && Boolean(user.panName && user.panNumber),
        required: true,
      },
      {
        id: 'PROFILE_COMPLETION',
        label: 'Profile details',
        completed: profileComplete,
        required: true,
      },
      {
        id: 'KYC_VERIFICATION',
        label: 'Identity verification',
        completed: user.kycStatus === KYCStatus.APPROVED,
        required: true,
      },
      {
        id: 'BENEFICIARY_SETUP',
        label: 'Beneficiary account',
        completed: beneficiaryCount > 0,
        required: true,
      },
    ];

    const currentStep = steps.find((step) => !step.completed)?.id ?? 'READY';
    const canAddBeneficiary = user.isMobileVerified && user.panVerified && profileComplete;
    const canTransfer =
      user.isMobileVerified &&
      user.panVerified &&
      profileComplete &&
      user.kycStatus === KYCStatus.APPROVED &&
      beneficiaryCount > 0;

    return {
      currentStep,
      steps,
      canAddBeneficiary,
      canTransfer,
      panFallbackAvailable: !user.panVerified,
    };
  }

  private isProfileComplete(user: User) {
    return [
      user.firstName,
      user.lastName,
      user.phoneNumber,
      user.addressLine1,
      user.city,
      user.state,
      user.postalCode,
    ].every((value) => Boolean(value?.toString().trim()));
  }
}
