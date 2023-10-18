FROM mcr.microsoft.com/dotnet/aspnet:7.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

FROM mcr.microsoft.com/dotnet/sdk:7.0 AS build
WORKDIR /src
COPY ["evanbecker-api/evanbecker-api/evanbecker-api.csproj", "evanbecker-api/"]
COPY ["evanbecker-api/evanbecker-domain/evanbecker-domain.csproj", "evanbecker-domain/"]
RUN dotnet restore "evanbecker-api/evanbecker-api.csproj"
COPY ./evanbecker-api/ .
WORKDIR "/src/evanbecker-api"
ENTRYPOINT ["bin/ls"]
RUN dotnet build "evanbecker-api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "evanbecker-api.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "evanbecker-api.dll"]
