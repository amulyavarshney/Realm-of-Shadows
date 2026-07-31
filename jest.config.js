/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    // Image stubs must win over the @/ path alias (e.g. @/assets/hero.jpg).
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/test-utils/fileMock.js',
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          strict: true,
          esModuleInterop: true,
          module: 'commonjs',
          moduleResolution: 'node',
          jsx: 'react',
          paths: { '@/*': ['./*'] },
        },
      },
    ],
  },
};
