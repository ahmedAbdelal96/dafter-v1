import { ListSuppliersUseCase } from './list-suppliers.use-case';
import { SuppliersRepository } from '../suppliers.repository';
import { SupplierQueryDto } from '../dto';

describe('ListSuppliersUseCase', () => {
  let useCase: ListSuppliersUseCase;
  let repo: jest.Mocked<Pick<SuppliersRepository, 'findMany'>>;

  beforeEach(() => {
    repo = {
      findMany: jest.fn(),
    };

    useCase = new ListSuppliersUseCase(repo as unknown as SuppliersRepository);
  });

  it('maps explicit query values to repository params and returns items/meta', async () => {
    repo.findMany.mockResolvedValue({
      data: [{ id: 'sup-1' }, { id: 'sup-2' }],
      total: 12,
      page: 2,
      limit: 5,
    });

    const query: SupplierQueryDto = {
      page: 2,
      limit: 5,
      search: 'mega',
      isActive: true,
      sortBy: 'name',
      sortOrder: 'asc',
    };

    const result = await useCase.execute('company-1', query);

    expect(repo.findMany).toHaveBeenCalledWith('company-1', {
      page: 2,
      limit: 5,
      search: 'mega',
      isActive: true,
      sortBy: 'name',
      sortOrder: 'asc',
    });

    expect(result).toEqual({
      items: [{ id: 'sup-1' }, { id: 'sup-2' }],
      meta: {
        page: 2,
        limit: 5,
        total: 12,
        totalPages: 3,
        hasNext: true,
        hasPrev: true,
      },
    });
  });

  it('uses default query values when optional inputs are omitted', async () => {
    repo.findMany.mockResolvedValue({
      data: [{ id: 'sup-1' }],
      total: 1,
      page: 1,
      limit: 20,
    });

    await useCase.execute('company-2', {} as SupplierQueryDto);

    expect(repo.findMany).toHaveBeenCalledWith('company-2', {
      page: 1,
      limit: 20,
      search: undefined,
      isActive: undefined,
      sortBy: undefined,
      sortOrder: undefined,
    });
  });

  it('returns correct meta and empty items when repository returns no data', async () => {
    repo.findMany.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    const result = await useCase.execute('company-3', {} as SupplierQueryDto);

    expect(result).toEqual({
      items: [],
      meta: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    });
  });

  it('passes search/isActive/sort fields exactly when provided', async () => {
    repo.findMany.mockResolvedValue({
      data: [],
      total: 4,
      page: 1,
      limit: 2,
    });

    await useCase.execute('company-4', {
      search: '0100',
      isActive: false,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    } as SupplierQueryDto);

    expect(repo.findMany).toHaveBeenCalledWith('company-4', {
      page: 1,
      limit: 20,
      search: '0100',
      isActive: false,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  });
});
