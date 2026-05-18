import { config } from '../../config/index.js';

const honorifics = new Set(['mr', 'mrs', 'ms', 'dr', 'shri', 'smt']);

const normalizeName = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((part) => part && !honorifics.has(part))
    .join(' ')
    .trim();

const levenshteinDistance = (left: string, right: string): number => {
  if (left === right) {
    return 0;
  }

  const matrix = Array.from({ length: left.length + 1 }, (_, row) =>
    Array.from({ length: right.length + 1 }, (_, column) =>
      row === 0 ? column : column === 0 ? row : 0
    )
  );

  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) {
      const substitutionCost = left[row - 1] === right[column - 1] ? 0 : 1;
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + substitutionCost
      );
    }
  }

  return matrix[left.length][right.length];
};

export const isSelfTransfer = (userPanName: string, beneficiaryName: string): boolean => {
  const normalizedPanName = normalizeName(userPanName);
  const normalizedBeneficiaryName = normalizeName(beneficiaryName);

  if (!normalizedPanName || !normalizedBeneficiaryName) {
    return false;
  }

  if (normalizedPanName === normalizedBeneficiaryName) {
    return true;
  }

  const panTokens = normalizedPanName.split(' ').filter(Boolean);
  const beneficiaryTokens = normalizedBeneficiaryName.split(' ').filter(Boolean);
  const overlappingTokens = panTokens.filter((token) =>
    beneficiaryTokens.some((candidate) => {
      if (token === candidate) {
        return true;
      }

      if (token.length === 1) {
        return candidate.startsWith(token);
      }

      if (candidate.length === 1) {
        return token.startsWith(candidate);
      }

      return false;
    })
  ).length;
  const tokenSimilarity =
    overlappingTokens / Math.max(panTokens.length || 1, beneficiaryTokens.length || 1);

  if (tokenSimilarity >= config.compliance.selfTransferTokenThreshold) {
    return true;
  }

  const distance = levenshteinDistance(normalizedPanName, normalizedBeneficiaryName);
  const similarity =
    1 - distance / Math.max(normalizedPanName.length, normalizedBeneficiaryName.length);

  return similarity >= config.compliance.selfTransferSimilarityThreshold;
};
