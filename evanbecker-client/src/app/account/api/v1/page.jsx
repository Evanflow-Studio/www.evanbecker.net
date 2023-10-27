"use client"

import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import "./style.css";
import {AccountLayout} from "@/components/Account/AccountLayout";

export default function Documentation() {
    const swaggerUrl = `${process.env.NEXT_PUBLIC_API_URL}swagger/v1/swagger.json`
    return (
        <>
            <AccountLayout>
                <div className="text-slate-200">
                    <SwaggerUI url={swaggerUrl} withCredentials/>
                </div>

            </AccountLayout>
        </>
    );
}