namespace evanbecker_api.Dto;

public class PagedDto<T>
{
    public int Page { get; set; }
    public int Total { get; set; }
    public IEnumerable<T>? Results { get; set; }
    public int TotalPages { get; set; }
}