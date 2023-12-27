export const configMock = {
  get: jest.fn(),
  has: jest.fn(),
};

export const repositoryMock = {
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
};
