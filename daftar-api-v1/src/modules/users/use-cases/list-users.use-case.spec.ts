import { UserStatus } from '@prisma/client';
import { ListUsersUseCase } from './list-users.use-case';
import { UsersRepository } from '../users.repository';
import { UserQueryDto } from '../dto';

describe('ListUsersUseCase', () => {
  let useCase: ListUsersUseCase;
  let repo: jest.Mocked<Pick<UsersRepository, 'findMany'>>;

  beforeEach(() => {
    repo = {
      findMany: jest.fn(),
    };

    useCase = new ListUsersUseCase(repo as unknown as UsersRepository);
  });

  it('maps explicit query values to repository params and returns items/meta', async () => {
    repo.findMany.mockResolvedValue({
      users: [{ id: 'u-1' }, { id: 'u-2' }],
      total: 25,
      page: 2,
      limit: 10,
    });

    const query: UserQueryDto = {
      page: 2,
      limit: 10,
      search: 'sara',
      status: UserStatus.ACTIVE,
      sortBy: 'fullName',
      sortOrder: 'asc',
    };

    const result = await useCase.execute('company-1', query);

    expect(repo.findMany).toHaveBeenCalledWith('company-1', {
      page: 2,
      limit: 10,
      search: 'sara',
      status: UserStatus.ACTIVE,
      sortBy: 'fullName',
      sortOrder: 'asc',
    });

    expect(result).toEqual({
      items: [{ id: 'u-1' }, { id: 'u-2' }],
      meta: {
        total: 25,
        page: 2,
        limit: 10,
        totalPages: 3,
        hasNext: true,
        hasPrevious: true,
      },
    });
  });

  it('uses default pagination values when query inputs are omitted', async () => {
    repo.findMany.mockResolvedValue({
      users: [{ id: 'u-1' }],
      total: 1,
      page: 1,
      limit: 10,
    });

    await useCase.execute('company-2', {} as UserQueryDto);

    expect(repo.findMany).toHaveBeenCalledWith('company-2', {
      page: 1,
      limit: 10,
      search: undefined,
      status: undefined,
      sortBy: undefined,
      sortOrder: undefined,
    });
  });

  it('returns empty items with consistent meta when repository returns no users', async () => {
    repo.findMany.mockResolvedValue({
      users: [],
      total: 0,
      page: 1,
      limit: 10,
    });

    const result = await useCase.execute('company-3', {} as UserQueryDto);

    expect(result).toEqual({
      items: [],
      meta: {
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
      },
    });
  });

  it('passes status/search/sort mapping as provided', async () => {
    repo.findMany.mockResolvedValue({
      users: [],
      total: 4,
      page: 1,
      limit: 2,
    });

    await useCase.execute('company-4', {
      search: 'owner',
      status: UserStatus.DISABLED,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    } as UserQueryDto);

    expect(repo.findMany).toHaveBeenCalledWith('company-4', {
      page: 1,
      limit: 10,
      search: 'owner',
      status: UserStatus.DISABLED,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  });
});
