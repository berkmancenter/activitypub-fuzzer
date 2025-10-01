export default {
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'json'],
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  transform: {
    '^.+\\.m?js$': 'babel-jest',
    '^.+\\.js$': 'babel-jest',
  },
};
