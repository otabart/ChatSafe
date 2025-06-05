// Basic console logger placeholder
// For a real application, use a more robust logging library like Winston or Pino

const getTimestamp = (): string => new Date().toISOString();

export const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(\`[\${getTimestamp()}] [INFO] \${message}\`, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(\`[\${getTimestamp()}] [WARN] \${message}\`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(\`[\${getTimestamp()}] [ERROR] \${message}\`, ...args);
  },
};
