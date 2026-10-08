import { ListCustomersUseCase } from './list-customers.use-case';
import { CustomersRepository } from '../customers.repository';
import { CustomerQueryDto } from '../dto';

describe('ListCustomersUseCase', () => {
  let useCase: ListCustomersUseCase;
  let repo: jest.Mocked<Pick<CustomersRepository, 'findMany'>>;

  beforeEach(() => {
    repo = {
      findMany: jest.fn(),
    };

    useCase = new ListCustomersUseCase(repo as unknown as CustomersRepository);
  });

  it('maps explicit query values to repository params and returns items/meta', async () => {
    repo.findMany.mockResolvedValue({
      data: [{ id: 'cust-1' }, { id: 'cust-2' }],
      total: 25,
      page: 2,
      limit: 10,
    });

    const query: CustomerQueryDto = {
      page: 2,
      limit: 10,
      search: 'ahmed',
      isActive: true,
      sortBy: 'name',
      sortOrder: 'asc',
    };

    const result = await useCase.execute('company-1', query);

    expect(repo.findMany).toHaveBeenCalledWith('company-1', {
      page: 2,
      limit: 10,
      search: 'ahmed',
      isActive: true,
      sortBy: 'name',
      sortOrder: 'asc',
    });

    expect(result).toEqual({
      items: [{ id: 'cust-1' }, { id: 'cust-2' }],
      meta: {
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: true,
      },
    });
  });

  it('uses default query values when optional inputs are omitted', async () => {
    repo.findMany.mockResolvedValue({
      data: [{ id: 'cust-1' }],
      total: 1,
      page: 1,
      limit: 10,
    });

    await useCase.execute('company-2', {} as CustomerQueryDto);

    expect(repo.findMany).toHaveBeenCalledWith('company-2', {
      page: 1,
      limit: 10,
      search: undefined,
      isActive: undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  });

  it('returns correct meta and empty items when repository returns no data', async () => {
    repo.findMany.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
    });

    const result = await useCase.execute('company-3', {} as CustomerQueryDto);

    expect(result).toEqual({
      items: [],
      meta: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    });
  });

  it('passes through search and isActive filters exactly when provided', async () => {
    repo.findMany.mockResolvedValue({
      data: [],
      total: 3,
      page: 3,
      limit: 1,
    });

    await useCase.execute('company-4', {
      search: '0100',
      isActive: false,
    } as CustomerQueryDto);

    expect(repo.findMany).toHaveBeenCalledWith('company-4', {
      page: 1,
      limit: 10,
      search: '0100',
      isActive: false,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  });
});
