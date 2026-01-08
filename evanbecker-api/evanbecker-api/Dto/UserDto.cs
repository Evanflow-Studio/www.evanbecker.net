namespace evanbecker_api.Dto;

public class UserDto
{
    
}

public class UserPersonalInformationDto
{
    public required string Avatar { get; set; }
    public required string FirstName { get; set; }
    public required string LastName { get; set; }
    public required string Email { get; set; } // are ignored on save
    public required string Auth0Id { get; set; } // are ignored on save
    public required string TimeZone { get; set; }
}

public class UserNotificationsDto
{
    
}