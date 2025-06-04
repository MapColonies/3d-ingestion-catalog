export const configMock = {
  get: jest.fn(),
  has: jest.fn(),
};

export const repositoryMock = {
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(),
};

export const queryMock = {
  where: jest.fn(),
  andWhere: jest.fn(),
  getMany: jest.fn(),
};
