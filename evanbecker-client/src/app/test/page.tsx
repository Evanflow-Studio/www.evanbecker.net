"use client"

import { useAuth0 } from "@auth0/auth0-react";

import React, { useState } from "react";
import {Container} from "@/components/Container";

export default function Test() {
    const {
        isLoading,
        isAuthenticated,
        error,
        user,
        logout,
        getAccessTokenSilently,
        loginWithPopup,
    } = useAuth0();
    const [result, setResult] = useState("");

    const getApiData = async () => {
        try {
            const accessToken = await getAccessTokenSilently();
            console.log("token:", accessToken);
            var call = await fetch(`${process.env.NEXT_PUBLIC_API_URL}auth/getdata`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                mode: "cors",
            });
            setResult(await call.text());
        } catch {
            setResult("Something didn't work");
        }
    };

    const getUsers = async () => {
        try {
            const accessToken = await getAccessTokenSilently();
            console.log("token:", accessToken);
            console.log("token length", accessToken.length);
            var call = await fetch(`${process.env.NEXT_PUBLIC_API_URL}auth/getusers`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                mode: "cors",
            });
            setResult(await call.text());
        } catch {
            setResult("Something didn't work");
        }
    };

    return (
            <Container>
                <h1>Auth0 authentification with .net Api</h1>
                <h1>
                    <a
                        onClick={() => loginWithPopup()}
                    >
                        Login
                    </a>
                    <a onClick={() => logout()}>
                        Logout
                    </a>
                </h1>

                <h1>
                    Logged in users E-Mail Address
                </h1>
                <p>{user?.email || "no E-Mail Address"}</p>
                <p>
                    Account is {!isAuthenticated && <strong>not</strong>} authenticated
                </p>

                    <h1>Data from the .net Api</h1>

                        <a onClick={getApiData}>
                            Get data from API
                        </a>
                        <a onClick={getUsers}>
                            Get Users from Auth0 through the API
                        </a>

                    <p>{result ? result : "Nothing loaded"}</p>

                    <h1>Debbuging messages</h1>
                    <p>Errors from Auth: {error?.message || "all good ✔"}</p>
            </Container>
    );
}