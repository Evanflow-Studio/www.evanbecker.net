"use client"

import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import "./style.css";
import {Header} from "@/components/Header";
import {Footer} from "@/components/Footer";
import {Container} from "@/components/Container";
import {AccountTab} from "@/components/Account/AccountTab";
import {AccountLayout} from "@/components/Account/AccountLayout";

export default function Documentation() {
    return (
        <>
            <AccountLayout>
                <SwaggerUI url="https://localhost:5003/swagger/v1/swagger.json" withCredentials/>
            </AccountLayout>
        </>
    );
}