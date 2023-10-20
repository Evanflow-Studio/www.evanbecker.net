"use client"

import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import "./style.css";
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