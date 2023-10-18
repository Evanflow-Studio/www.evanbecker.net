"use client";

import { AccountTab } from "@/components/Account/AccountTab";
import { AccountLayout } from "@/components/Account/AccountLayout";
import { useEffect, useRef, useState } from "react";
import { User } from "@/data/Comment";
import { useAuth0 } from "@auth0/auth0-react";

export default function AccountSettings() {

    const [user, setUser] = useState(null as User);
    const [image, setImage] = useState(null);
    const [base64Image, setBase64Image] = useState("");
    const inputFile = useRef(null);
    const { getAccessTokenSilently } = useAuth0();

    const handleFileUpload = e => {
        const { files } = e.target;
        if (files && files.length) {
            const filename = files[0].name;

            var parts = filename.split(".");
            const fileType = parts[parts.length - 1];
            console.log("fileType", fileType); //ex: zip, rar, jpg, svg etc.

            setImage(files[0]);
        }
    };

    useEffect(() => {
        console.log("in useEffect! ", user, inputFile)
        if (user && !inputFile.current.value)
        {
            console.log("new image:", user.avatar);
            setBase64Image(user.avatar);
        }
    }, [user])


    useEffect(() => {
        if (image)
        {
            let reader = new FileReader();
            reader.readAsDataURL(image);
            reader.onload = () => setBase64Image(reader.result as string);
        }
    }, [image])


    const getUser = async () => {
        try {
            const accessToken = await getAccessTokenSilently();
            var call = await fetch(`https://localhost:5003/api/v1/user`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                mode: "cors",
            });
            setUser(await call.json());
        } catch (e) {
            console.error(e);
        }
    }

    useEffect(() => {
        getUser().then();
    }, []);

    return (
            <AccountLayout>
                <AccountTab/>

                {/* Settings forms */}
                {user && (<div className="divide-y divide-white/5">
                    <div className="grid max-w-7xl grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8">
                        <div>
                            <h2 className="text-base font-semibold leading-7 text-white">Personal Information</h2>
                            <p className="mt-1 text-sm leading-6 text-gray-400">
                                Use a permanent address where you can receive mail.
                            </p>
                        </div>

                        <form className="md:col-span-2">
                            <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:max-w-xl sm:grid-cols-6">
                                <div className="col-span-full flex items-center gap-x-8">
                                    <img
                                        src={base64Image}
                                        alt="Avatar"
                                        className="h-24 w-24 flex-none rounded-lg bg-gray-800 object-cover"
                                    />
                                    <div>
                                        <input
                                            style={{ display: "none" }}
                                            ref={inputFile}
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                            type="file"
                                        />
                                        <button
                                            type="button"
                                            className="rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-white/20"
                                            onClick={() => inputFile.current.click()}
                                        >
                                            Change avatar
                                        </button>
                                        <p className="mt-2 text-xs leading-5 text-gray-400">JPG, GIF or PNG. 1MB max.</p>
                                    </div>
                                </div>

                                <div className="sm:col-span-3">
                                    <label htmlFor="first-name" className="block text-sm font-medium leading-6 text-white">
                                        First name
                                    </label>
                                    <div className="mt-2">
                                        <input
                                            type="text"
                                            name="first-name"
                                            id="first-name"
                                            autoComplete="given-name"
                                            value={user.firstName}
                                            className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                                        />
                                    </div>
                                </div>

                                <div className="sm:col-span-3">
                                    <label htmlFor="last-name" className="block text-sm font-medium leading-6 text-white">
                                        Last name
                                    </label>
                                    <div className="mt-2">
                                        <input
                                            type="text"
                                            name="last-name"
                                            id="last-name"
                                            autoComplete="family-name"
                                            value={user.lastName}
                                            className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                                        />
                                    </div>
                                </div>

                                <div className="col-span-full">
                                    <label htmlFor="email" className="block text-sm font-medium leading-6 text-white">
                                        Email address
                                    </label>
                                    <div className="mt-2">
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            value={user.email}
                                            className="block w-full rounded-md border-0 bg-slate-950 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                                        />
                                    </div>
                                </div>

                                <div className="col-span-full">
                                    <label htmlFor="email" className="block text-sm font-medium leading-6 text-white">
                                        Auth0 Id
                                    </label>
                                    <div className="mt-2">
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            disabled
                                            value={user.auth0Id}
                                            className="block w-full rounded-md border-0 bg-slate-950 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                                        />
                                    </div>
                                </div>

                                <div className="col-span-full">
                                    <label htmlFor="timezone" className="block text-sm font-medium leading-6 text-white">
                                        Timezone
                                    </label>
                                    <div className="mt-2">
                                        <select
                                            id="timezone"
                                            name="timezone"
                                            className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6 [&_*]:text-black"
                                        >
                                            <option value="Central Standard Time">(GMT-06:00) Central Time (US & Canada)</option>
                                            <option value="Morocco Standard Time">(GMT) Casablanca</option>
                                            <option value="GMT Standard Time">(GMT) Greenwich Mean Time : Dublin, Edinburgh, Lisbon, London</option>
                                            <option value="Greenwich Standard Time">(GMT) Monrovia, Reykjavik</option>
                                            <option value="W. Europe Standard Time">(GMT+01:00) Amsterdam, Berlin, Bern, Rome, Stockholm, Vienna</option>
                                            <option value="Central Europe Standard Time">(GMT+01:00) Belgrade, Bratislava, Budapest, Ljubljana, Prague</option>
                                            <option value="Romance Standard Time">(GMT+01:00) Brussels, Copenhagen, Madrid, Paris</option>
                                            <option value="Central European Standard Time">(GMT+01:00) Sarajevo, Skopje, Warsaw, Zagreb</option>
                                            <option value="W. Central Africa Standard Time">(GMT+01:00) West Central Africa</option>
                                            <option value="Jordan Standard Time">(GMT+02:00) Amman</option>
                                            <option value="GTB Standard Time">(GMT+02:00) Athens, Bucharest, Istanbul</option>
                                            <option value="Middle East Standard Time">(GMT+02:00) Beirut</option>
                                            <option value="Egypt Standard Time">(GMT+02:00) Cairo</option>
                                            <option value="South Africa Standard Time">(GMT+02:00) Harare, Pretoria</option>
                                            <option value="FLE Standard Time">(GMT+02:00) Helsinki, Kyiv, Riga, Sofia, Tallinn, Vilnius</option>
                                            <option value="Israel Standard Time">(GMT+02:00) Jerusalem</option>
                                            <option value="E. Europe Standard Time">(GMT+02:00) Minsk</option>
                                            <option value="Namibia Standard Time">(GMT+02:00) Windhoek</option>
                                            <option value="Arabic Standard Time">(GMT+03:00) Baghdad</option>
                                            <option value="Arab Standard Time">(GMT+03:00) Kuwait, Riyadh</option>
                                            <option value="Russian Standard Time">(GMT+03:00) Moscow, St. Petersburg, Volgograd</option>
                                            <option value="E. Africa Standard Time">(GMT+03:00) Nairobi</option>
                                            <option value="Georgian Standard Time">(GMT+03:00) Tbilisi</option>
                                            <option value="Iran Standard Time">(GMT+03:30) Tehran</option>
                                            <option value="Arabian Standard Time">(GMT+04:00) Abu Dhabi, Muscat</option>
                                            <option value="Azerbaijan Standard Time">(GMT+04:00) Baku</option>
                                            <option value="Mauritius Standard Time">(GMT+04:00) Port Louis</option>
                                            <option value="Caucasus Standard Time">(GMT+04:00) Yerevan</option>
                                            <option value="Afghanistan Standard Time">(GMT+04:30) Kabul</option>
                                            <option value="Ekaterinburg Standard Time">(GMT+05:00) Ekaterinburg</option>
                                            <option value="Pakistan Standard Time">(GMT+05:00) Islamabad, Karachi</option>
                                            <option value="West Asia Standard Time">(GMT+05:00) Tashkent</option>
                                            <option value="India Standard Time">(GMT+05:30) Chennai, Kolkata, Mumbai, New Delhi</option>
                                            <option value="Sri Lanka Standard Time">(GMT+05:30) Sri Jayawardenepura</option>
                                            <option value="Nepal Standard Time">(GMT+05:45) Kathmandu</option>
                                            <option value="N. Central Asia Standard Time">(GMT+06:00) Almaty, Novosibirsk</option>
                                            <option value="Central Asia Standard Time">(GMT+06:00) Astana, Dhaka</option>
                                            <option value="Myanmar Standard Time">(GMT+06:30) Yangon (Rangoon)</option>
                                            <option value="SE Asia Standard Time">(GMT+07:00) Bangkok, Hanoi, Jakarta</option>
                                            <option value="North Asia Standard Time">(GMT+07:00) Krasnoyarsk</option>
                                            <option value="China Standard Time">(GMT+08:00) Beijing, Chongqing, Hong Kong, Urumqi</option>
                                            <option value="North Asia East Standard Time">(GMT+08:00) Irkutsk, Ulaan Bataar</option>
                                            <option value="Singapore Standard Time">(GMT+08:00) Kuala Lumpur, Singapore</option>
                                            <option value="W. Australia Standard Time">(GMT+08:00) Perth</option>
                                            <option value="Taipei Standard Time">(GMT+08:00) Taipei</option>
                                            <option value="Tokyo Standard Time">(GMT+09:00) Osaka, Sapporo, Tokyo</option>
                                            <option value="Korea Standard Time">(GMT+09:00) Seoul</option>
                                            <option value="Yakutsk Standard Time">(GMT+09:00) Yakutsk</option>
                                            <option value="Cen. Australia Standard Time">(GMT+09:30) Adelaide</option>
                                            <option value="AUS Central Standard Time">(GMT+09:30) Darwin</option>
                                            <option value="E. Australia Standard Time">(GMT+10:00) Brisbane</option>
                                            <option value="AUS Eastern Standard Time">(GMT+10:00) Canberra, Melbourne, Sydney</option>
                                            <option value="West Pacific Standard Time">(GMT+10:00) Guam, Port Moresby</option>
                                            <option value="Tasmania Standard Time">(GMT+10:00) Hobart</option>
                                            <option value="Vladivostok Standard Time">(GMT+10:00) Vladivostok</option>
                                            <option value="Central Pacific Standard Time">(GMT+11:00) Magadan, Solomon Is., New Caledonia</option>
                                            <option value="New Zealand Standard Time">(GMT+12:00) Auckland, Wellington</option>
                                            <option value="Fiji Standard Time">(GMT+12:00) Fiji, Kamchatka, Marshall Is.</option>
                                            <option value="Tonga Standard Time">(GMT+13:00) Nuku'alofa</option>
                                            <option value="Azores Standard Time">(GMT-01:00) Azores</option>
                                            <option value="Cape Verde Standard Time">(GMT-01:00) Cape Verde Is.</option>
                                            <option value="Mid-Atlantic Standard Time">(GMT-02:00) Mid-Atlantic</option>
                                            <option value="E. South America Standard Time">(GMT-03:00) Brasilia</option>
                                            <option value="Argentina Standard Time">(GMT-03:00) Buenos Aires</option>
                                            <option value="SA Eastern Standard Time">(GMT-03:00) Georgetown</option>
                                            <option value="Greenland Standard Time">(GMT-03:00) Greenland</option>
                                            <option value="Montevideo Standard Time">(GMT-03:00) Montevideo</option>
                                            <option value="Newfoundland Standard Time">(GMT-03:30) Newfoundland</option>
                                            <option value="Atlantic Standard Time">(GMT-04:00) Atlantic Time (Canada)</option>
                                            <option value="SA Western Standard Time">(GMT-04:00) La Paz</option>
                                            <option value="Central Brazilian Standard Time">(GMT-04:00) Manaus</option>
                                            <option value="Pacific SA Standard Time">(GMT-04:00) Santiago</option>
                                            <option value="Venezuela Standard Time">(GMT-04:30) Caracas</option>
                                            <option value="SA Pacific Standard Time">(GMT-05:00) Bogota, Lima, Quito, Rio Branco</option>
                                            <option value="Eastern Standard Time">(GMT-05:00) Eastern Time (US & Canada)</option>
                                            <option value="US Eastern Standard Time">(GMT-05:00) Indiana (East)</option>
                                            <option value="Central America Standard Time">(GMT-06:00) Central America</option>

                                            <option value="Central Standard Time (Mexico)">(GMT-06:00) Guadalajara, Mexico City, Monterrey</option>
                                            <option value="Canada Central Standard Time">(GMT-06:00) Saskatchewan</option>
                                            <option value="US Mountain Standard Time">(GMT-07:00) Arizona</option>
                                            <option value="Mountain Standard Time (Mexico)">(GMT-07:00) Chihuahua, La Paz, Mazatlan</option>
                                            <option value="Mountain Standard Time">(GMT-07:00) Mountain Time (US & Canada)</option>
                                            <option value="Pacific Standard Time">(GMT-08:00) Pacific Time (US & Canada)</option>
                                            <option value="Pacific Standard Time (Mexico)">(GMT-08:00) Tijuana, Baja California</option>
                                            <option value="Alaskan Standard Time">(GMT-09:00) Alaska</option>
                                            <option value="Hawaiian Standard Time">(GMT-10:00) Hawaii</option>
                                            <option value="Samoa Standard Time">(GMT-11:00) Midway Island, Samoa</option>
                                            <option value="Dateline Standard Time">(GMT-12:00) International Date Line West</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex">
                                <button
                                    type="submit"
                                    className="rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                                >
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="grid max-w-7xl grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8">
                        <div>
                            <h2 className="text-base font-semibold leading-7 text-white">Change password</h2>
                            <p className="mt-1 text-sm leading-6 text-gray-400">
                                Update your password associated with your account.
                            </p>
                        </div>

                        <form className="md:col-span-2">
                            <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:max-w-xl sm:grid-cols-6">
                                <div className="col-span-full">
                                    <label htmlFor="current-password" className="block text-sm font-medium leading-6 text-white">
                                        Current password
                                    </label>
                                    <div className="mt-2">
                                        <input
                                            id="current-password"
                                            name="current_password"
                                            type="password"
                                            autoComplete="current-password"
                                            className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                                        />
                                    </div>
                                </div>

                                <div className="col-span-full">
                                    <label htmlFor="new-password" className="block text-sm font-medium leading-6 text-white">
                                        New password
                                    </label>
                                    <div className="mt-2">
                                        <input
                                            id="new-password"
                                            name="new_password"
                                            type="password"
                                            autoComplete="new-password"
                                            className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                                        />
                                    </div>
                                </div>

                                <div className="col-span-full">
                                    <label htmlFor="confirm-password" className="block text-sm font-medium leading-6 text-white">
                                        Confirm password
                                    </label>
                                    <div className="mt-2">
                                        <input
                                            id="confirm-password"
                                            name="confirm_password"
                                            type="password"
                                            autoComplete="new-password"
                                            className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex">
                                <button
                                    type="submit"
                                    className="rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                                >
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="grid max-w-7xl grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8">
                        <div>
                            <h2 className="text-base font-semibold leading-7 text-white">Delete account</h2>
                            <p className="mt-1 text-sm leading-6 text-gray-400">
                                No longer want to use our service? You can delete your account here. This action is not reversible.
                                All information related to this account will be deleted permanently.
                            </p>
                        </div>

                        <form className="flex items-start md:col-span-2">
                            <button
                                type="submit"
                                className="rounded-md bg-red-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-400"
                            >
                                Yes, delete my account
                            </button>
                        </form>
                    </div>
                </div>)}
            </AccountLayout>
    )
}