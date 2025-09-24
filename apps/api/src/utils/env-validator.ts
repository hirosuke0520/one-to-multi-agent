/**
 * Environment validation utility
 * Validates required environment variables for Google authentication
 */

interface EnvConfig {
  // Database
  DB_HOST: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_NAME: string;
  DB_PORT?: string;

  // Google OAuth
  AUTH_GOOGLE_ID?: string;
  AUTH_GOOGLE_SECRET?: string;
  AUTH_SECRET?: string;

  // API Configuration
  PORT?: string;
  NODE_ENV?: string;

  // AI Service
  GOOGLE_API_KEY?: string;
  USE_REAL_AI?: string;

  // Storage
  STORAGE_TYPE?: string;
  GCS_BUCKET_NAME?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class EnvValidator {
  private static requiredVars = [
    "DB_HOST",
    "DB_USER",
    "DB_PASSWORD",
    "DB_NAME",
  ];

  private static productionRequiredVars = [
    "AUTH_GOOGLE_ID",
    "AUTH_GOOGLE_SECRET", 
    "AUTH_SECRET",
    "GOOGLE_API_KEY",
  ];

  /**
   * Validate environment variables
   */
  static validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const env = process.env as unknown as EnvConfig;
    const isProduction = env.NODE_ENV === "production";

    // Check required variables
    for (const varName of this.requiredVars) {
      if (!env[varName as keyof EnvConfig]) {
        errors.push(`Missing required environment variable: ${varName}`);
      }
    }

    // Check production-specific variables
    if (isProduction) {
      for (const varName of this.productionRequiredVars) {
        if (!env[varName as keyof EnvConfig]) {
          errors.push(
            `Missing required environment variable for production: ${varName}`
          );
        }
      }
    } else {
      // Development warnings
      for (const varName of this.productionRequiredVars) {
        if (!env[varName as keyof EnvConfig]) {
          warnings.push(
            `Missing ${varName} - Google authentication may not work`
          );
        }
      }
    }

    // Validate specific configurations
    this.validateDatabaseConfig(env, errors, warnings);
    this.validateAuthConfig(env, errors, warnings);
    this.validateStorageConfig(env, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private static validateDatabaseConfig(
    env: EnvConfig,
    errors: string[],
    warnings: string[]
  ) {
    // Check database port
    if (env.DB_PORT && isNaN(Number(env.DB_PORT))) {
      errors.push("DB_PORT must be a valid number");
    }

    // Check Cloud SQL format for production
    if (env.NODE_ENV === "production" && env.DB_HOST) {
      if (
        !env.DB_HOST.startsWith("/cloudsql/") &&
        !env.DB_HOST.includes("amazonaws.com")
      ) {
        warnings.push(
          "Production DB_HOST should use Cloud SQL socket path or managed database URL"
        );
      }
    }
  }

  private static validateAuthConfig(
    env: EnvConfig,
    errors: string[],
    warnings: string[]
  ) {
    // Check AUTH_SECRET length
    if (env.AUTH_SECRET) {
      if (env.AUTH_SECRET.length < 32) {
        warnings.push(
          "AUTH_SECRET should be at least 32 characters for security"
        );
      }

      if (
        env.AUTH_SECRET ===
        "your-nextauth-secret-generate-with-openssl-rand-base64-32"
      ) {
        errors.push(
          "AUTH_SECRET is still using the example value. Generate a secure secret."
        );
      }
    }

    // Check Google OAuth configuration
    if (
      env.AUTH_GOOGLE_ID === "your-google-client-id" ||
      env.AUTH_GOOGLE_SECRET === "your-google-client-secret"
    ) {
      errors.push("Google OAuth credentials are still using example values");
    }

    // Check OAuth ID format
    if (
      env.AUTH_GOOGLE_ID &&
      !env.AUTH_GOOGLE_ID.endsWith(".googleusercontent.com")
    ) {
      warnings.push("AUTH_GOOGLE_ID should end with .googleusercontent.com");
    }
  }

  private static validateStorageConfig(
    env: EnvConfig,
    errors: string[],
    warnings: string[]
  ) {
    if (env.STORAGE_TYPE === "gcs") {
      if (!env.GCS_BUCKET_NAME) {
        errors.push("GCS_BUCKET_NAME is required when STORAGE_TYPE=gcs");
      }
    }

    // Check AI configuration
    if (env.USE_REAL_AI === "true") {
      if (
        !env.GOOGLE_API_KEY ||
        env.GOOGLE_API_KEY === "your-gemini-api-key-here"
      ) {
        errors.push("GOOGLE_API_KEY is required when USE_REAL_AI=true");
      }
    }
  }

  /**
   * Log validation results
   */
  static logValidationResults(result: ValidationResult) {
    if (result.isValid) {
      console.log("✅ Environment validation passed");
    } else {
      console.error("❌ Environment validation failed:");
      result.errors.forEach((error) => console.error(`   • ${error}`));
    }

    if (result.warnings.length > 0) {
      console.warn("⚠️  Environment warnings:");
      result.warnings.forEach((warning) => console.warn(`   • ${warning}`));
    }
  }

  /**
   * Generate help message for missing variables
   */
  static generateHelpMessage(result: ValidationResult): string {
    if (result.isValid) return "";

    let help = "\n📋 Environment Setup Help:\n";
    help += "========================\n\n";

    if (result.errors.some((e) => e.includes("AUTH_"))) {
      help += "🔑 Google OAuth Setup:\n";
      help += "1. Go to: https://console.cloud.google.com/apis/credentials\n";
      help += "2. Create or select OAuth 2.0 Client ID\n";
      help += "3. Set AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET\n";
      help += "4. Generate AUTH_SECRET: openssl rand -base64 32\n\n";
    }

    if (result.errors.some((e) => e.includes("DB_"))) {
      help += "🗄️  Database Setup:\n";
      help += "1. Ensure PostgreSQL is running\n";
      help += "2. Create database: CREATE DATABASE one_to_multi_agent;\n";
      help +=
        "3. Run: psql -d one_to_multi_agent -f scripts/setup-database.sql\n\n";
    }

    if (result.errors.some((e) => e.includes("GOOGLE_API_KEY"))) {
      help += "🤖 AI Service Setup:\n";
      help += "1. Go to: https://console.cloud.google.com/apis/credentials\n";
      help += "2. Create API Key for Gemini API\n";
      help += "3. Set GOOGLE_API_KEY in your .env file\n\n";
    }

    help += "📖 For detailed setup instructions, see: SETUP-COLLABORATORS.md\n";
    help += "🔧 For debugging help, run: ./scripts/debug-auth.sh\n";

    return help;
  }
}

// Export utility function for easy use
export function validateEnvironment(): ValidationResult {
  return EnvValidator.validate();
}

export function validateAndExit(): void {
  const result = EnvValidator.validate();

  EnvValidator.logValidationResults(result);

  if (!result.isValid) {
    console.error(EnvValidator.generateHelpMessage(result));
    process.exit(1);
  }
}
