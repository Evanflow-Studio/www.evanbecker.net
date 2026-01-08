# Developer Certificate Arguments
ARG ASPNETCORE_Kestrel__Certificates__Default__Path
ARG ASPNETCORE_Kestrel__Certificates__Default__KeyPath
ARG ASPNETCORE_Kestrel__Certificates__Default__Password

FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS build
ARG ASPNETCORE_Kestrel__Certificates__Default__Password
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
RUN mkdir /config
# Developer Certificate Creation
RUN dotnet dev-certs https --export-path /config/aspnetapp.pem --password "${ASPNETCORE_Kestrel__Certificates__Default__Password}" --format PEM

FROM base AS final
# Developer Certificate Arguments
ARG ASPNETCORE_Kestrel__Certificates__Default__Path
ARG ASPNETCORE_Kestrel__Certificates__Default__KeyPath
ARG ASPNETCORE_Kestrel__Certificates__Default__Password
ENV ASPNETCORE_Kestrel__Certificates__Default__Path=$ASPNETCORE_Kestrel__Certificates__Default__Path
ENV ASPNETCORE_Kestrel__Certificates__Default__KeyPath=$ASPNETCORE_Kestrel__Certificates__Default__KeyPath
ENV ASPNETCORE_Kestrel__Certificates__Default__Password=$ASPNETCORE_Kestrel__Certificates__Default__Password

WORKDIR /app

# Developer Certificate Setup
RUN apk add ca-certificates 
RUN mkdir /config 
RUN mkdir -p /usr/local/share/ca-certificates/
COPY --from=publish /config /config
ENV DOTNET_CLI_TELEMETRY_OPTOUT=1
RUN echo "hello ${ASPNETCORE_Kestrel__Certificates__Default__Path}!"
RUN cp /config/aspnetapp.pem $ASPNETCORE_Kestrel__Certificates__Default__Path
RUN cp /config/aspnetapp.key $ASPNETCORE_Kestrel__Certificates__Default__KeyPath
RUN chmod 755 $ASPNETCORE_Kestrel__Certificates__Default__Path 
RUN chmod +x $ASPNETCORE_Kestrel__Certificates__Default__Path
RUN cat $ASPNETCORE_Kestrel__Certificates__Default__Path >> /etc/ssl/certs/ca-certificates.crt
RUN chmod 755 $ASPNETCORE_Kestrel__Certificates__Default__KeyPath
RUN chmod +x $ASPNETCORE_Kestrel__Certificates__Default__KeyPath
RUN update-ca-certificates


COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "evanbecker-api.dll"]
