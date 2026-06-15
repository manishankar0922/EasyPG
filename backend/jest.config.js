module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleNameMapper: {
    '^uuid$': '<rootDir>/src/test/mocks/uuid.ts'
  },
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts']
};
