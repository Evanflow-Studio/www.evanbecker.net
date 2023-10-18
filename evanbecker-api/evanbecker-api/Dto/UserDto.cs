namespace evanbecker_api.Dto;

public class UserDto
{
    
}

public class UserPersonalInformationDto
{
    public string Avatar { get; set; }
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public string Email { get; set; } // are ignored on save
    public string Auth0Id { get; set; } // are ignored on save
    public string TimeZone { get; set; }
}

public class UserNotificationsDto
{
    
}