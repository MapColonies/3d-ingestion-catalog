export const lookupTablesMock = {
  getClassifications: jest.fn(),
};

export const configMock = {
  get: jest.fn(),
  has: jest.fn(),
};

export const validationManagerMock = {
  validatePost: jest.fn(),
  validatePatch: jest.fn(),
};

export const repositoryMock = {
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
};

export const storeTriggerMock = {
  createFlow: jest.fn(),
};
