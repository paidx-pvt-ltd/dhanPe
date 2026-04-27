import 'package:flutter/material.dart';

class AppColors {
  static const background = Color(0xFF0D0D17);
  static const surface = Color(0xFF151523);
  static const surfaceLow = Color(0xFF1A1A2A);
  static const surfaceHigh = Color(0xFF232337);
  static const surfaceHighest = Color(0xFF2A2941);
  static const glass = Color(0x66252433);
  static const primary = Color(0xFFBD9DFF);
  static const primaryDim = Color(0xFF8A4CFC);
  static const secondary = Color(0xFF34B5FA);
  static const tertiary = Color(0xFFFF86C3);
  static const success = Color(0xFF41D38D);
  static const warning = Color(0xFFFF6E84);
  static const text = Color(0xFFE7E3F3);
  static const textMuted = Color(0xFFACA9B8);
  static const outline = Color(0x33474753);
}

class AppGradients {
  static const kinetic = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppColors.primaryDim, AppColors.secondary],
  );

  static const panelGlow = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0x33BD9DFF), Color(0x1134B5FA)],
  );

  static const pageBackground = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0xFF141427), AppColors.background, AppColors.background],
  );
}

class AppTheme {
  static const double xlRadius = 32;
  static const double lgRadius = 24;
  static const double mdRadius = 18;
  static const double pillRadius = 999;

  static ThemeData buildTheme() {
    final base = ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AppColors.background,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.primary,
        secondary: AppColors.secondary,
        surface: AppColors.surface,
        error: AppColors.warning,
        onPrimary: Colors.white,
        onSecondary: Colors.white,
        onSurface: AppColors.text,
      ),
    );

    return base.copyWith(
      textTheme: base.textTheme.copyWith(
        displayLarge: _display(44),
        displayMedium: _display(34),
        displaySmall: _display(28),
        headlineLarge: _headline(30),
        headlineMedium: _headline(24),
        headlineSmall: _headline(20),
        titleLarge: _body(18, FontWeight.w700),
        titleMedium: _body(16, FontWeight.w700),
        titleSmall: _body(14, FontWeight.w700),
        bodyLarge: _body(16, FontWeight.w500),
        bodyMedium: _body(14, FontWeight.w500),
        bodySmall: _body(12, FontWeight.w600, AppColors.textMuted),
        labelLarge: _body(15, FontWeight.w700, Colors.white),
        labelMedium: _body(12, FontWeight.w700, AppColors.textMuted, 0.8),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        foregroundColor: AppColors.text,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surfaceHighest.withValues(alpha: 0.7),
        hintStyle: _body(14, FontWeight.w500, AppColors.textMuted),
        labelStyle: _body(13, FontWeight.w700, AppColors.textMuted, 0.7),
        prefixIconColor: AppColors.textMuted,
        suffixIconColor: AppColors.textMuted,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 20,
          vertical: 18,
        ),
        border: _inputBorder(AppColors.outline),
        enabledBorder: _inputBorder(AppColors.outline),
        focusedBorder: _inputBorder(AppColors.primary.withValues(alpha: 0.4)),
        errorBorder: _inputBorder(AppColors.warning.withValues(alpha: 0.5)),
        focusedErrorBorder: _inputBorder(
          AppColors.warning.withValues(alpha: 0.7),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          foregroundColor: Colors.white,
          backgroundColor: Colors.transparent,
          shadowColor: Colors.transparent,
          minimumSize: const Size.fromHeight(58),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(pillRadius),
          ),
          textStyle: _body(16, FontWeight.w800, Colors.white),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.text,
          side: const BorderSide(color: AppColors.outline),
          minimumSize: const Size.fromHeight(54),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(xlRadius),
          ),
          textStyle: _body(15, FontWeight.w700),
        ),
      ),
      cardTheme: CardThemeData(
        color: AppColors.surfaceHigh,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(lgRadius),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppColors.surfaceHighest,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        contentTextStyle: _body(14, FontWeight.w600),
      ),
      dividerColor: AppColors.outline,
    );
  }

  static BoxDecoration panel({
    Gradient? gradient,
    Color color = AppColors.surfaceHigh,
    bool glass = false,
  }) {
    return BoxDecoration(
      color: glass ? AppColors.glass : color,
      gradient: gradient,
      borderRadius: BorderRadius.circular(lgRadius),
      border: Border.all(color: AppColors.outline),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.26),
          blurRadius: 32,
          offset: const Offset(0, 16),
        ),
      ],
    );
  }

  static BoxDecoration glowingOrb(Color color, {double opacity = 0.18}) {
    return BoxDecoration(
      shape: BoxShape.circle,
      color: color.withValues(alpha: opacity),
      boxShadow: [
        BoxShadow(
          color: color.withValues(alpha: opacity * 1.2),
          blurRadius: 70,
          spreadRadius: 6,
        ),
      ],
    );
  }

  static Widget gradientButtonChild(String label, {IconData? icon}) {
    return Ink(
      decoration: BoxDecoration(
        gradient: AppGradients.kinetic,
        borderRadius: BorderRadius.circular(pillRadius),
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryDim.withValues(alpha: 0.32),
            blurRadius: 24,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: Container(
        alignment: Alignment.center,
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 18),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(icon, size: 18),
              const SizedBox(width: 8),
            ],
            Text(label),
          ],
        ),
      ),
    );
  }

  static TextStyle _display(double size) {
    return TextStyle(
      fontSize: size,
      height: 1.02,
      fontWeight: FontWeight.w800,
      letterSpacing: -1.2,
      color: AppColors.text,
    );
  }

  static TextStyle _headline(double size) {
    return TextStyle(
      fontSize: size,
      height: 1.08,
      fontWeight: FontWeight.w700,
      letterSpacing: -0.8,
      color: AppColors.text,
    );
  }

  static TextStyle _body(
    double size,
    FontWeight weight, [
    Color color = AppColors.text,
    double letterSpacing = -0.2,
  ]) {
    return TextStyle(
      fontSize: size,
      height: 1.3,
      fontWeight: weight,
      letterSpacing: letterSpacing,
      color: color,
    );
  }

  static OutlineInputBorder _inputBorder(Color color) {
    return OutlineInputBorder(
      borderRadius: BorderRadius.circular(xlRadius),
      borderSide: BorderSide(color: color),
    );
  }
}
