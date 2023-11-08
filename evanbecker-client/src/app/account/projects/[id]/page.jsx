"use client"

import {AccountLayout} from "@/components/Account/AccountLayout";
import { EllipsisVerticalIcon, ArrowLongLeftIcon, ArrowLongRightIcon,
    PlusIcon, TrashIcon, CheckIcon, ChevronUpDownIcon, ExclamationTriangleIcon, PlusCircleIcon } from '@heroicons/react/20/solid'
import { useRef, Fragment, useState, useEffect } from 'react'
import clsx from 'clsx'
import {
    CheckCircleIcon,

    FaceFrownIcon,
    FaceSmileIcon,
    FireIcon,
    HandThumbUpIcon,
    HeartIcon,
    PaperClipIcon,
    XMarkIcon,
    UserCircleIcon, UserIcon, RocketLaunchIcon,
} from '@heroicons/react/24/solid'
import { Menu, Listbox, Transition } from '@headlessui/react'

import { ChevronRightIcon } from '@heroicons/react/20/solid'
import {PhotoIcon} from "@heroicons/react/24/outline";
import {useAuth0} from "@auth0/auth0-react";
import {usePathname} from "next/navigation";
import LoadingSpinnerLarge from "../../../../components/LoadingSpinnerLarge";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import {formatDate} from "../../../../lib/formatDate";

const activityLogType = {
    comment: 0,
    createProject: 1,
    editProjectName: 2,
    changeEnvironment: 3,
    changeEnvironmentUrl: 4,
    changeRepository: 5,
    changeNotifications: 6,
    addMember: 7,
    addPhoto: 8,
    deployment: 9,
    synced: 10,
    changeProjectType: 11,
}

function ProjectNotFound() {
    return (
        <>
            <main className="grid min-h-full place-items-center bg-slate-900 px-6 py-24 sm:py-32 lg:px-8">
                <div className="text-center">
                    <p className="text-base font-semibold text-primary">404</p>
                    <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-200 sm:text-5xl">Project not found</h1>
                    <p className="mt-6 text-base leading-7 text-slate-400">Sorry, we couldn&apos;t find the project you’re looking for. Maybe you don&apos;t have enough permissions 🤷‍♂️.</p>
                    <div className="mt-10 flex items-center justify-center gap-x-6">
                        <a
                            href="/account/projects"
                            className="rounded-md bg-primary px-3.5 py-2.5 text-sm font-semibold text-slate-200 shadow-sm hover:bg-tertiary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tertiary"
                        >
                            Go back to Projects
                        </a>
                        <a href="/contact" className="text-sm font-semibold text-slate-200">
                            Contact me <span aria-hidden="true">&rarr;</span>
                        </a>
                    </div>
                </div>
            </main>
        </>
    )
}

function EditProject({currentProject}) {
    const [projectName, setProjectName] = useState(currentProject?.name);
    const [repository, setRepository] = useState(currentProject?.repository);
    const [isProjectNameLoading, setIsProjectNameLoading] = useState(false);
    const [isRepositoryLoading, setIsRepositoryLoading] = useState(false);
    const [isEnvironmentSaveLoading, setIsEnvironmentSaveLoading] = useState(false);
    const [isEnvironmentUrlSaveLoading, setIsEnvironmentUrlSaveLoading] = useState(false);
    const [isProjectNotificationsLoading, setIsProjectNotificationsLoading] = useState(false);
    const [isProjectTypeLoading, setIsProjectTypeLoading] = useState(false);
    const [environmentsList, setEnvironmentsList] = useState([]);
    const [environmentUrlList, setEnvironmentUrlList] = useState([]);
    const [project, setProject] = useState(currentProject);
    const [user, setUser] = useState(null);

    const [selectedType, setSelectedType] = useState(null);

    const [notifyOnComments, setNotifyOnComments] = useState(currentProject?.notifyOnComments ?? false);
    const [notifyOnPhotos, setNotifyOnPhotos] = useState(currentProject?.notifyOnPhotos ?? false);
    const [notifyOnMembers, setNotifyOnMembers] = useState(currentProject?.notifyOnMembers ?? false);
    const [notifyRecipients, setNotifyRecipients] = useState(currentProject?.notifyRecipients);

    const [selected, setSelected] = useState([]);
    const [selectableEnvironments, setSelectableEnvironments] = useState([]);
    const [selectableTypes, setSelectableTypes] = useState([]);

    const pathname = usePathname();
    const { getAccessTokenSilently } = useAuth0();

    const getUser = async () => {
        try {
            const accessToken = await getAccessTokenSilently();
            var call = await fetch(`${process.env.NEXT_PUBLIC_API_URL}api/v1/user`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': "*",
                },
                mode: "cors",
            });
            setUser(await call.json());
        } catch (e) {
            console.error(e);
        }
    }

    const saveProjectName = async () => {
        try {
            setIsProjectNameLoading(true);
            const accessToken = await getAccessTokenSilently();
            const splitUrl = pathname.split('/');
            const targetLocation = splitUrl[splitUrl.length-1];
            var call = await fetch(`${process.env.NEXT_PUBLIC_API_URL}api/v1/project/${targetLocation}/name/${projectName}`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                mode: "cors",
            });

            var savedProject = await call.json();
            setProject({...currentProject, name: savedProject.name})
            console.log("returned saved project: ", savedProject);
        } catch (e) {
            console.error("Something didn't work", e);
        }

        setIsProjectNameLoading(false);
    }

    const saveNotificationSettings = async () => {
        try {
            setIsProjectNotificationsLoading(true);
            const accessToken = await getAccessTokenSilently();
            const splitUrl = pathname.split('/');
            const targetLocation = splitUrl[splitUrl.length-1];
            let body = JSON.stringify({
                notifyOnComments: notifyOnComments,
                notifyOnMembers: notifyOnMembers,
                notifyOnPhotos: notifyOnPhotos,
                notifyRecipients: notifyRecipients,
            });
            var call = await fetch(`${process.env.NEXT_PUBLIC_API_URL}api/v1/project/${targetLocation}/notifications`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                mode: "cors",
                body: body,
            });

            var savedProject = await call.json();
            setProject({
                ...currentProject,
                notifyOnComments: savedProject.notifyOnComments,
                notifyOnMembers: savedProject.notifyOnMembers,
                notifyOnPhotos: savedProject.notifyOnPhotos,
                notifyRecipients: savedProject.notifyRecipients
            });
            console.log("returned saved project: ", savedProject);
        } catch (e) {
            console.error("Something didn't work", e);
        }

        setIsProjectNotificationsLoading(false);
    }

    const saveProjectType = async () => {
        try {
            setIsProjectTypeLoading(true);
            const accessToken = await getAccessTokenSilently();
            const splitUrl = pathname.split('/');
            const targetLocation = splitUrl[splitUrl.length-1];

            var call = await fetch(`${process.env.NEXT_PUBLIC_API_URL}api/v1/project/${targetLocation}/type/${selectedType.name}`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                mode: "cors",
            });

            var savedProject = await call.json();
            setProject({
                ...currentProject,
                projectType: savedProject.projectType
            });
            console.log("returned saved project: ", savedProject);
        } catch (e) {
            console.error("Something didn't work", e);
        }

        setIsProjectTypeLoading(false);
    }

    const saveRepository = async () => {
        try {
            setIsRepositoryLoading(true);
            const accessToken = await getAccessTokenSilently();
            const splitUrl = pathname.split('/');
            const targetLocation = splitUrl[splitUrl.length-1];
            var call = await fetch(`${process.env.NEXT_PUBLIC_API_URL}api/v1/project/${targetLocation}/repository/${repository}`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                mode: "cors",
            });

            var savedProject = await call.json();
            setProject({...currentProject, repository: savedProject.repository})
            console.log("returned saved project: ", savedProject);
        } catch (e) {
            console.error("Something didn't work", e);
        }

        setIsRepositoryLoading(false);
    }

    const saveEnvironmentUrls = async () => {
        try {
            setIsEnvironmentUrlSaveLoading(true);
            const accessToken = await getAccessTokenSilently();
            const splitUrl = pathname.split('/');
            const targetLocation = splitUrl[splitUrl.length-1];
            let body = JSON.stringify(environmentUrlList.map((environmentUrl, index) => {return {
                id: environmentUrl.id,
                name: environmentUrl.name,
                url: environmentUrl.url,
                isDeleted: environmentUrl.isDeleted,
                environmentId: selected[index].id
            }}));
            console.log("body: ", body);
            var call = await fetch(`${process.env.NEXT_PUBLIC_API_URL}api/v1/project/${targetLocation}/environmentsUrls`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: body,
                mode: "cors",
            });

            var savedProject = await call.json();
            setProject({...currentProject, environmentUrls: savedProject.environmentUrls})
            console.log("returned saved project: ", savedProject);
        } catch (e) {
            console.error("Something didn't work", e);
        }

        setIsEnvironmentUrlSaveLoading(false);
    }

    const saveEnvironments = async () => {
        try {
            setIsEnvironmentSaveLoading(true);
            const accessToken = await getAccessTokenSilently();
            const splitUrl = pathname.split('/');
            const targetLocation = splitUrl[splitUrl.length-1];
            let body = JSON.stringify(environmentsList.map(x => {return {
                id: x.id,
                name: x.name,
                isDeleted: x.isDeleted
            }}));
            console.log("body: ", body);
            var call = await fetch(`${process.env.NEXT_PUBLIC_API_URL}api/v1/project/${targetLocation}/environments`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: body,
                mode: "cors",
            });

            var savedProject = await call.json();
            setProject({...currentProject, environments: savedProject.environments})
            console.log("returned saved project: ", savedProject);
        } catch (e) {
            console.error("Something didn't work", e);
        }

        setIsEnvironmentSaveLoading(false);
    }

    const updateEnvironmentText = (id, index, name) => {
        let newdata = [...environmentsList];
        newdata[index] = {id, name};
        setEnvironmentsList(newdata);
    }

    const updateEnvironmentUrlNameText = (id, index, name, url) => {
        let newdata = [...environmentUrlList];
        newdata[index] = {id, name, url};
        setEnvironmentUrlList(newdata);
    }

    const updateAssociatedEnvironment = (index, envId) => {
        console.log("e", envId);
        let selectedEnvironment = selectableEnvironments.find(y => y.id == envId);
        let newdata = [...environmentUrlList];
        newdata[index] = {...newdata[index], environmentId: envId};
        let newSelected = [...selected];
        newSelected[index] = selectedEnvironment;
        setSelected(newSelected)
        setEnvironmentUrlList(newdata);
    }

    const addNewEnvironmentUrlRow = () => {
        if  (selected?.length > 0)
            setSelected([...selected, selectableEnvironments[0]]);
        else {
            setSelected([selectableEnvironments[0]]);
        }
        setEnvironmentUrlList([...environmentUrlList, {}]);
    }

    const addNewEnvironmentRow = () => {
        setEnvironmentsList([...environmentsList, {}]);
    }

    const removeEnvironmentUrlRow = (id, index) => {
        let newdata = [...environmentUrlList];
        newdata[index] = {...newdata[index], isDeleted: true};
        setEnvironmentUrlList(newdata);
        console.log(environmentUrlList);
    }

    const removeEnvironmentRow = (id, index) => {
        let newdata = [...environmentsList];
        newdata[index] = {...newdata[index], isDeleted: true};
        setEnvironmentsList(newdata);
        console.log(environmentsList);
    }

    useEffect(() => {
        getUser().then()
    }, [])

    useEffect(() => {
        setEnvironmentsList(project?.environments)

        let mappedEnvironments = project?.environments.map(x => {
            return {id: x.id, name: x.name, isDeleted: x.isDeleted}
        });

        console.log("new recipientlist:", project);

        setNotifyOnPhotos(project?.notifyOnPhotos);
        setNotifyOnComments(project?.notifyOnComments);
        setNotifyOnMembers(project?.notifyOnMembers);
        setNotifyRecipients(project?.notifyRecipients);

        console.log("updating...", mappedEnvironments);
        let selectableTypes = [
            {id: 1, name: "Website"},
            {id: 2, name: "Game"},
        ];
        setSelectableTypes(selectableTypes);
        setSelectedType(selectableTypes.find(x => x.name === project?.projectType) || selectableTypes[0]);
        setSelectableEnvironments(mappedEnvironments);
        if (mappedEnvironments?.length > 0)
            setSelected(mappedEnvironments[0]);

        setSelected(project?.environmentUrls.map(x => mappedEnvironments.find(y => y.id == x.environmentId)));
        setEnvironmentUrlList(project?.environmentUrls)
    }, [project]);

    return (
        <form className="py-10 ml-24 mr-24">
            <h2 className="px-4 text-2xl font-semibold leading-7 text-white sm:px-6 lg:px-8">Edit Project</h2>
            <div className="space-y-12 ml-8 mr-8">
                <div className="border-b border-white/10 pb-12">
                    <p className="mt-1 text-sm leading-6 text-slate-400">
                        This information will be displayed publicly so be careful what you share.
                    </p>

                    <label htmlFor="username" className="block text-sm font-medium leading-6 text-white mt-6">
                        Project Name
                    </label>
                    <div className="mt-2">
                        <div className="flex rounded-md pl-2 bg-white/5 ring-1 ring-inset ring-white/10 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500">
                            <input
                                type="text"
                                name="username"
                                id="username"
                                disabled={!(user?.isOwner == true)}
                                value={projectName || ""}
                                onChange={(e) => setProjectName(e.target.value)}
                                autoComplete="username"
                                className="flex-1 border-0 bg-transparent py-1.5 pl-1 text-white focus:ring-0 sm:text-sm sm:leading-6 disabled:cursor-not-allowed"
                                placeholder="www.evanbecker.net"
                            />
                        </div>
                    </div>


                    <div className="mt-8 flex">
                        <button
                            type="button"
                            disabled={!(user?.isOwner == true)}
                            onClick={() => saveProjectName()}
                            className="flex inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-tertiary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tertiary disabled:cursor-not-allowed disabled:bg-slate-800"
                        >
                            {isProjectNameLoading && <LoadingSpinner/>}
                            {!isProjectNameLoading && <div>Save</div>}
                        </button>
                    </div>
                </div>

                <div className="border-b border-white/10 pb-12">
                    <h2 className="text-base font-semibold leading-7 text-white">Repository</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-400">Choose the repository to connect to.</p>
                    <label htmlFor="username" className="block text-sm font-medium leading-6 text-white mt-6">
                        GitHub Repo
                    </label>
                    <div className="mt-2">
                        <div className="flex rounded-md bg-white/5 ring-1 ring-inset ring-white/10 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500">
                            <span className="flex select-none items-center pl-3 text-slate-300 sm:text-sm cursor-not-allowed">https://github.com/Evanflow-Studio/</span>
                            <input
                                type="text"
                                name="username"
                                id="username"
                                autoComplete="username"
                                disabled={!(user?.isOwner == true)}
                                className="flex-1 border-0 bg-transparent py-1.5 pl-1 text-white focus:ring-0 sm:text-sm sm:leading-6 disabled:cursor-not-allowed"
                                value={repository || ""}
                                onChange={(e) => setRepository(e.target.value)}
                                placeholder="my-github-repository"
                            />
                        </div>
                    </div>
                    <div className="mt-8 flex">
                        <button
                            type="button"
                            onClick={() => saveRepository()}
                            disabled={!(user?.isOwner == true)}
                            className="flex inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-tertiary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tertiary disabled:cursor-not-allowed disabled:bg-slate-800  disabled:cursor-not-allowed disabled:bg-slate-800"
                        >
                            {isRepositoryLoading && <LoadingSpinner/>}
                            {!isRepositoryLoading && <div>Save</div>}
                        </button>
                    </div>
                </div>

                <div className="border-b border-white/10 pb-12">
                    <h2 className="text-base font-semibold leading-7 text-white">Type</h2>

                    <label htmlFor="username" className="block text-sm font-medium leading-6 text-white mt-6">
                        Project Type
                    </label>
                    <div className="mt-2 flex inline-flex">
                        <Listbox value={selectedType} onChange={(e) => setSelectedType(e)}>
                                {({ open }) => (
                                    <>
                                        <div className="relative mr-6 w-64 mt-0.5">
                                            <Listbox.Button className="relative w-full cursor-default rounded-md bg-slate-900 py-1.5 pl-3 pr-10 text-left text-slate-200 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6">
                                                <span className="block truncate">{selectedType?.name || ''}</span>
                                                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </span>
                                            </Listbox.Button>

                                            <Transition
                                                show={open}
                                                as={Fragment}
                                                leave="transition ease-in duration-100"
                                                leaveFrom="opacity-100"
                                                leaveTo="opacity-0"
                                            >
                                                <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-slate-950 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                                                    {selectableTypes?.map((env) => (
                                                        <Listbox.Option
                                                            key={env.id}
                                                            className={({ active }) =>
                                                                classNames(
                                                                    active ? 'bg-indigo-600 text-white' : 'text-slate-200',
                                                                    'relative cursor-default select-none py-2 pl-3 pr-9'
                                                                )
                                                            }
                                                            value={env}
                                                        >
                                                            {({ selected, active }) => (
                                                                <>
                        <span className={classNames(selected ? 'font-semibold' : 'font-normal', 'block truncate')}>
                          {env.name}
                        </span>


                                                                    {env.isDeleted ? (
                                                                        <span
                                                                            className={classNames(
                                                                                active ? 'text-white' : 'text-red-600',
                                                                                'absolute inset-y-0 right-8 flex items-center pr-4'
                                                                            )}
                                                                        >
                                                                        <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                                                                      </span>
                                                                    ) : null}
                                                                </>
                                                            )}
                                                        </Listbox.Option>
                                                    ))}
                                                </Listbox.Options>
                                            </Transition>
                                        </div>
                                    </>
                                )}
                            </Listbox>
                    </div>

                    <div className="mt-8 flex">
                        <button
                            type="button"
                            disabled={!(user?.isOwner == true)}
                            onClick={() => saveProjectType()}
                            className="flex inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-tertiary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tertiary disabled:cursor-not-allowed disabled:bg-slate-800"
                        >
                            {isProjectTypeLoading && <LoadingSpinner/>}
                            {!isProjectTypeLoading && <div>Save</div>}
                        </button>
                    </div>
                </div>

                <div className="border-b border-white/10 pb-12">
                    <h2 className="text-base font-semibold leading-7 text-white">Environment</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-400">Add the different environments you want to track.</p>

                    {environmentsList?.map((environment, index) => {
                            return !environment.isDeleted && (<div key={environment.id}>
                                <label htmlFor="username" className="block text-sm font-medium leading-6 text-white mt-6">
                                    Environment
                                </label>
                                <div className="mt-2 flex inline-flex">
                                    <div
                                        className="flex rounded-md pl-2 bg-white/5 ring-1 ring-inset ring-white/10 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500">
                                        <input
                                            type="text"
                                            name="env"
                                            id="env"
                                            autoComplete="env"
                                            disabled={!(user?.isOwner == true)}
                                            value={environment.name}
                                            onChange={(e) => updateEnvironmentText(environment.id, index, e.target.value)}
                                            className="flex-1 border-0 bg-transparent py-1.5 pl-1 text-white focus:ring-0 sm:text-sm sm:leading-6 disabled:cursor-not-allowed"
                                            placeholder="stage"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        disabled={!(user?.isOwner == true)}
                                        onClick={() => removeEnvironmentRow(environment.id, index)}
                                        className="flex ml-6 inline-flex items-center rounded-md bg-red-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500  disabled:cursor-not-allowed disabled:bg-slate-800"
                                    >
                                        <TrashIcon className="h-4 w-4 mr-1"/>
                                        Remove
                                    </button>
                                </div>
                            </div>)
                        }
                    )}

                    <div className="mt-8 flex">
                        <button
                            type="button"
                            onClick={() => addNewEnvironmentRow()}
                            disabled={!(user?.isOwner == true)}
                            className="flex inline-flex items-center rounded-md bg-tertiary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:bg-slate-800"
                        >
                            <PlusIcon className="h-4 w-4 mr-1"/>
                            Add New Environment
                        </button>
                    </div>

                    <div className="mt-8 flex">
                        <button
                            type="button"
                            onClick={() => saveEnvironments()}
                            disabled={!(user?.isOwner == true)}
                            className="flex inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-tertiary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tertiary disabled:cursor-not-allowed disabled:bg-slate-800"
                        >
                            {isEnvironmentSaveLoading && <LoadingSpinner/>}
                            {!isEnvironmentSaveLoading && <div>Save</div>}
                        </button>
                    </div>
                </div>

                <div className="border-b border-white/10 pb-12">
                    <h2 className="text-base font-semibold leading-7 text-white">Environment URLs</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-400">Add the different environments URLs you want to track.</p>


                    {environmentUrlList?.map((environmentUrl, index) => {
                        return !environmentUrl.isDeleted && (
                            <div key={environmentUrl.id}>
                                <label htmlFor="username" className="block text-sm font-medium leading-6 text-white mt-6">
                                    Environment URL
                                </label>
                                <div className="mt-2 flex inline-flex">
                                    <Listbox value={selected[index]} onChange={(e) => updateAssociatedEnvironment(index, e.id)}>
                                        {({ open }) => (
                                            <>
                                                <div className="relative mr-6 w-64 mt-0.5">
                                                    <Listbox.Button className="relative w-full cursor-default rounded-md bg-slate-900 py-1.5 pl-3 pr-10 text-left text-slate-200 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6">
                                                        <span className="block truncate">{selected[index].name}</span>
                                                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </span>
                                                    </Listbox.Button>

                                                    <Transition
                                                        show={open}
                                                        as={Fragment}
                                                        leave="transition ease-in duration-100"
                                                        leaveFrom="opacity-100"
                                                        leaveTo="opacity-0"
                                                    >
                                                        <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-slate-950 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                                                            {selectableEnvironments?.map((env) => (
                                                                <Listbox.Option
                                                                    key={env.id}
                                                                    className={({ active }) =>
                                                                        classNames(
                                                                            active ? 'bg-indigo-600 text-white' : 'text-slate-200',
                                                                            'relative cursor-default select-none py-2 pl-3 pr-9'
                                                                        )
                                                                    }
                                                                    value={env}
                                                                >
                                                                    {({ selected, active }) => (
                                                                        <>
                        <span className={classNames(selected ? 'font-semibold' : 'font-normal', 'block truncate')}>
                          {env.name}
                        </span>


                                                                            {env.isDeleted ? (
                                                                                <span
                                                                                    className={classNames(
                                                                                        active ? 'text-white' : 'text-red-600',
                                                                                        'absolute inset-y-0 right-8 flex items-center pr-4'
                                                                                    )}
                                                                                >
                                                                        <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                                                                      </span>
                                                                            ) : null}


                                                                            {selected[index] ? (
                                                                                <span
                                                                                    className={classNames(
                                                                                        active ? 'text-white' : 'text-primary',
                                                                                        'absolute inset-y-0 right-0 flex items-center pr-4'
                                                                                    )}
                                                                                >
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                                                                            ) : null}
                                                                        </>
                                                                    )}
                                                                </Listbox.Option>
                                                            ))}
                                                        </Listbox.Options>
                                                    </Transition>
                                                </div>
                                            </>
                                        )}
                                    </Listbox>
                                    <div className="flex rounded-md w-48 mr-6 pl-2 bg-white/5 ring-1 ring-inset ring-white/10 focus-within:ring-2 focus-within:ring-inset focus-within:primary">
                                        <input
                                            type="text"
                                            name="urlname"
                                            id="urlname"
                                            disabled={!(user?.isOwner == true)}
                                            value={environmentUrl.name}
                                            onChange={(e) => updateEnvironmentUrlNameText(environmentUrl.id, index, e.target.value, environmentUrl.url)}
                                            autoComplete="urlname"
                                            className="flex-1 border-0 bg-transparent py-1.5 pl-1 text-white focus:ring-0 sm:text-sm sm:leading-6 disabled:cursor-not-allowed"
                                            placeholder="Client"
                                        />
                                    </div>
                                    <div className="flex rounded-md w-96 pl-2 bg-white/5 ring-1 ring-inset ring-white/10 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary">
                                        <input
                                            type="text"
                                            name="url"
                                            id="url"
                                            disabled={!(user?.isOwner == true)}
                                            value={environmentUrl.url}
                                            onChange={(e) => updateEnvironmentUrlNameText(environmentUrl.id, index, environmentUrl.name, e.target.value)}
                                            autoComplete="url"
                                            className="flex-1 border-0 bg-transparent py-1.5 pl-1 text-white focus:ring-0 sm:text-sm sm:leading-6 disabled:cursor-not-allowed"
                                            placeholder="https://www.evanbecker.net/"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeEnvironmentUrlRow(environmentUrl.id, index)}
                                        disabled={!(user?.isOwner == true)}
                                        className="flex ml-6 inline-flex items-center rounded-md bg-red-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:cursor-not-allowed disabled:bg-slate-800"
                                    >
                                        <TrashIcon className="h-4 w-4 mr-1"/>
                                        Remove
                                    </button>

                                </div>
                            </div>
                        )
                    })}









                    <div className="mt-8 flex">
                        <button
                            type="button"
                            onClick={() => addNewEnvironmentUrlRow()}
                            disabled={!(user?.isOwner == true)}
                            className="flex inline-flex items-center rounded-md bg-tertiary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:bg-slate-800"
                        >
                            <PlusIcon className="h-4 w-4 mr-1"/>
                            Add New URL
                        </button>
                    </div>
                    <div className="mt-8 flex">
                        <button
                            type="button"
                            disabled={!(user?.isOwner == true)}
                            onClick={() => saveEnvironmentUrls()}
                            className="flex inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-tertiary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tertiary disabled:cursor-not-allowed disabled:bg-slate-800"
                        >
                            {isEnvironmentUrlSaveLoading && <LoadingSpinner/>}
                            {!isEnvironmentUrlSaveLoading && <div>Save</div>}
                        </button>
                    </div>
                </div>

                <div className="border-b border-white/10 pb-12">
                    <h2 className="text-base font-semibold leading-7 text-white">Notifications</h2>
                    <p className="mt-1 text-sm leading-6 text-gray-400">
                        We&apos;ll always let you know about important changes, but you pick what else you want to hear about.
                    </p>

                    <div className="mt-10 space-y-10">
                        <fieldset>
                            <legend className="text-sm font-semibold leading-6 text-white">By Email</legend>
                            <div className="mt-6 space-y-6">
                                <div className="relative flex gap-x-3">
                                    <div className="flex h-6 items-center">
                                        <input
                                            id="comments"
                                            name="comments"
                                            disabled={!(user?.isOwner == true)}
                                            checked={notifyOnComments}
                                            onChange={(e) => setNotifyOnComments(e.target.checked)}
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-white/10 bg-white/5 text-primary focus:ring-primary focus:ring-offset-slate-950 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                    <div className="text-sm leading-6">
                                        <label htmlFor="comments" className="font-medium text-white">
                                            Comments
                                        </label>
                                        <p className="text-gray-400">Get notified when someones posts a comment on this project.</p>
                                    </div>
                                </div>
                                <div className="relative flex gap-x-3">
                                    <div className="flex h-6 items-center">
                                        <input
                                            id="members"
                                            name="members"
                                            disabled={!(user?.isOwner == true)}
                                            checked={notifyOnMembers}
                                            onChange={(e) => setNotifyOnMembers(e.target.checked)}
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-white/10 bg-white/5 text-primary focus:ring-primary focus:ring-offset-slate-950 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                    <div className="text-sm leading-6">
                                        <label htmlFor="members" className="font-medium text-white">
                                            Members
                                        </label>
                                        <p className="text-gray-400">Get notified when a member joins this project.</p>
                                    </div>
                                </div>
                                <div className="relative flex gap-x-3">
                                    <div className="flex h-6 items-center">
                                        <input
                                            id="photos"
                                            name="photos"
                                            disabled={!(user?.isOwner == true)}
                                            checked={notifyOnPhotos}
                                            onChange={(e) => setNotifyOnPhotos(e.target.checked)}
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-white/10 bg-white/5 text-primary focus:ring-primary focus:ring-offset-slate-950 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                    <div className="text-sm leading-6">
                                        <label htmlFor="photos" className="font-medium text-white">
                                            Photos
                                        </label>
                                        <p className="text-gray-400">Get notified when a new photo is added.</p>
                                    </div>
                                </div>
                            </div>
                        </fieldset>
                        <fieldset>
                            <legend className="text-sm font-semibold leading-6 text-white">Notification Digest</legend>
                            <p className="mt-1 text-sm leading-6 text-gray-400">Who should receive notification digests for this project.</p>
                            <div className="mt-6 space-y-6">
                                <div className="flex items-center gap-x-3">
                                    <input
                                        id="push-everything"
                                        name="only-evan"
                                        disabled={!(user?.isOwner == true)}
                                        value="OnlyEvan"
                                        checked={notifyRecipients == "OnlyEvan"}
                                        onChange={(e) => setNotifyRecipients(e.target.value)}
                                        type="radio"
                                        className="h-4 w-4 border-white/10 bg-white/5 text-primary focus:ring-primary focus:ring-offset-slate-950 disabled:cursor-not-allowed"
                                    />
                                    <label htmlFor="push-everything" className="block text-sm font-medium leading-6 text-white">
                                        Only Evan
                                    </label>
                                </div>
                                <div className="flex items-center gap-x-3">
                                    <input
                                        id="push-email"
                                        name="push-notifications"
                                        disabled={!(user?.isOwner == true)}
                                        value="OnlyMembers"
                                        checked={notifyRecipients == "OnlyMembers"}
                                        onChange={(e) => setNotifyRecipients(e.target.value)}
                                        type="radio"
                                        className="h-4 w-4 border-white/10 bg-white/5 text-primary focus:ring-primary focus:ring-offset-slate-950 disabled:cursor-not-allowed"
                                    />
                                    <label htmlFor="push-email" className="block text-sm font-medium leading-6 text-white">
                                        Only Members
                                    </label>
                                </div>
                                <div className="flex items-center gap-x-3">
                                    <input
                                        id="push-nothing"
                                        name="push-notifications"
                                        disabled={!(user?.isOwner == true)}
                                        value="OnlyEmailSubscribers"
                                        checked={notifyRecipients == "OnlyEmailSubscribers"}
                                        onChange={(e) => setNotifyRecipients(e.target.value)}
                                        type="radio"
                                        className="h-4 w-4 border-white/10 bg-white/5 text-primary focus:ring-primary focus:ring-offset-slate-950 disabled:cursor-not-allowed"
                                    />
                                    <label htmlFor="push-nothing" className="block text-sm font-medium leading-6 text-white">
                                        Only Email Subscribers
                                    </label>
                                </div>
                                <div className="flex items-center gap-x-3">
                                    <input
                                        id="push-nothing"
                                        name="push-notifications"
                                        disabled={!(user?.isOwner == true)}
                                        value="Everyone"
                                        checked={notifyRecipients == "Everyone"}
                                        onChange={(e) => setNotifyRecipients(e.target.value)}
                                        type="radio"
                                        className="h-4 w-4 border-white/10 bg-white/5 text-primary focus:ring-primary focus:ring-offset-slate-950 disabled:cursor-not-allowed"
                                    />
                                    <label htmlFor="push-nothing" className="block text-sm font-medium leading-6 text-white">
                                        Everyone
                                    </label>
                                </div>
                            </div>
                        </fieldset>
                        <div className="mt-8 flex">
                            <button
                                type="button"
                                disabled={!(user?.isOwner == true)}
                                onClick={() => saveNotificationSettings()}
                                className="flex inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-tertiary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tertiary disabled:cursor-not-allowed disabled:bg-slate-800"
                            >
                                {isProjectNotificationsLoading && <LoadingSpinner/>}
                                {!isProjectNotificationsLoading && <div>Save</div>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    )
}

function AddUser() {
    const [emailAddress, setEmailAddress] = useState('');

    const pathname = usePathname();
    const addEmailAddress = async () => {
        try {
            const splitUrl = pathname.split('/');
            const targetLocation = splitUrl[splitUrl.length-1];
            var call = await fetch(`${process.env.NEXT_PUBLIC_API_URL}api/v1/project/${targetLocation}/email`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(emailAddress),
                mode: "cors",
            });
            setEmailAddress('')
        } catch (e) {
            console.error("Something didn't work", e);
        }
    };

    return (
        <div className="mx-auto max-w-3xl">
            <div>
                <div className="text-center">
                    <svg
                        className="mx-auto h-12 w-12 text-slate-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 48 48"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M34 40h10v-4a6 6 0 00-10.712-3.714M34 40H14m20 0v-4a9.971 9.971 0 00-.712-3.714M14 40H4v-4a6 6 0 0110.713-3.714M14 40v-4c0-1.313.253-2.566.713-3.714m0 0A10.003 10.003 0 0124 26c4.21 0 7.813 2.602 9.288 6.286M30 14a6 6 0 11-12 0 6 6 0 0112 0zm12 6a4 4 0 11-8 0 4 4 0 018 0zm-28 0a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                    </svg>
                    <h2 className="mt-2 text-base font-semibold leading-6 text-slate-200">Add team members</h2>
                    <p className="mt-1 text-sm text-slate-400">
                        Add new team members to this project. Members will be subscribed to changes and can have extra permissions on the project. Or, if you are logged in as a user, you can simply join the project at the Details page.
                    </p>
                </div>
                <form action="#" className="mt-6 flex">
                    <label htmlFor="email" className="sr-only">
                        Email address
                    </label>
                    <input
                        type="email"
                        name="email"
                        id="email"
                        value={emailAddress || ""}
                        onChange={(e) => setEmailAddress(e.target.value)}
                        className="block w-full rounded-md bg-slate-900 border-0 py-1.5 text-slate-200 shadow-sm ring-1 ring-inset ring-slate-500 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                        placeholder="Enter an email"
                    />
                    <button
                        type="button"
                        onClick={() => addEmailAddress()}
                        className="ml-4 flex-shrink-0 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tertiary"
                    >
                        Send invite
                    </button>
                </form>
            </div>
        </div>
    )
}

const people = [
    {
        name: 'Leslie Alexander',
        email: 'leslie.alexander@example.com',
        role: 'Co-Founder / CEO',
        imageUrl:
            'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        href: '#',
        lastSeen: '3h ago',
        lastSeenDateTime: '2023-01-23T13:23Z',
    },
    {
        name: 'Michael Foster',
        email: 'michael.foster@example.com',
        role: 'Co-Founder / CTO',
        imageUrl:
            'https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        href: '#',
        lastSeen: '3h ago',
        lastSeenDateTime: '2023-01-23T13:23Z',
    },
    {
        name: 'Dries Vincent',
        email: 'dries.vincent@example.com',
        role: 'Business Relations',
        imageUrl:
            'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        href: '#',
        lastSeen: null,
    },
    {
        name: 'Lindsay Walton',
        email: 'lindsay.walton@example.com',
        role: 'Front-end Developer',
        imageUrl:
            'https://images.unsplash.com/photo-1517841905240-472988babdf9?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        href: '#',
        lastSeen: '3h ago',
        lastSeenDateTime: '2023-01-23T13:23Z',
    },
    {
        name: 'Courtney Henry',
        email: 'courtney.henry@example.com',
        role: 'Designer',
        imageUrl:
            'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        href: '#',
        lastSeen: '3h ago',
        lastSeenDateTime: '2023-01-23T13:23Z',
    },
    {
        name: 'Tom Cook',
        email: 'tom.cook@example.com',
        role: 'Director of Product',
        imageUrl:
            'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        href: '#',
        lastSeen: null,
    },
]

function MembersList({currentProject}) {
    const [project, setProject] = useState(currentProject);

    return (
        <div className="py-10 ml-24 mr-24">
            <h2 className="px-4 text-2xl font-semibold leading-7 text-white sm:px-6 lg:px-8">Member List</h2>
            <ul role="list" className="divide-y divide-slate-700 ml-12 mr-12 mt-6">
                {project?.members?.map((member) => (
                <li key={member.email} className="flex justify-between gap-x-6 py-5">
                    <div className="flex min-w-0 gap-x-4">
                        <img className="h-12 w-12 flex-none rounded-full bg-slate-500" src={member.avatar} alt="" />
                        <div className="min-w-0 flex-auto">
                            <p className="text-sm font-semibold leading-6 text-slate-200">
                                <a href="#" className="hover:underline">
                                    {member.firstName} {member.lastName}
                                </a>
                            </p>
                            <p className="mt-1 flex text-xs leading-5 text-slate-400">
                                <a href={`mailto:${member.email}`} className="truncate hover:underline">
                                    {member.email}
                                </a>
                            </p>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-x-6">
                        <div className="hidden sm:flex sm:flex-col sm:items-end">
                            <p className="text-sm leading-6 text-slate-200">{member.isOwner ? "Owner" : (member.isAdmin ? "Admin" : "Member")}</p>
                            <div className="mt-1 flex items-center gap-x-1.5">
                                <div className="flex-none rounded-full bg-emerald-500/20 p-1">
                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                </div>
                                <p className="text-xs leading-5 text-slate-400">Active</p>
                            </div>
                        </div>
                    </div>
                </li>
            ))}
            </ul>
            <AddUser/>
        </div>
    )
}

const projects = [


    { name: 'Graph API', initials: 'Test', href: '#', members: 16, bgColor: 'bg-pink-600' },
    { name: 'Component Design', initials: 'Prod', href: '#', members: 12, bgColor: 'bg-purple-600' },
    { name: 'Templates', initials: 'T', href: '#', members: 16, bgColor: 'bg-yellow-500' },
    { name: 'React Components', initials: 'RC', href: '#', members: 8, bgColor: 'bg-green-500' },
]

function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
}

const statuses = {
    Unavailable: 'text-gray-500 bg-gray-100/10',
    Success: 'text-green-400 bg-green-400/10',
    Failure: 'text-rose-400 bg-rose-400/10',
}
const environments = {
    Test: 'text-yellow-400 bg-yellow-400/10 ring-yellow-400/20',
    test: 'text-yellow-400 bg-yellow-400/10 ring-yellow-400/20',
    UAT: 'text-gray-400 bg-gray-400/10 ring-gray-400/20',
    Uat: 'text-gray-400 bg-gray-400/10 ring-gray-400/20',
    uat: 'text-gray-400 bg-gray-400/10 ring-gray-400/20',
    Stage: 'text-gray-400 bg-gray-400/10 ring-gray-400/20',
    stage: 'text-gray-400 bg-gray-400/10 ring-gray-400/20',
    prod: 'text-tertiary bg-tertiary/10 ring-tertiary/30',
    Prod: 'text-tertiary bg-tertiary/10 ring-tertiary/30',
    production: 'text-tertiary bg-tertiary/10 ring-tertiary/30',
    Production: 'text-tertiary bg-tertiary/10 ring-tertiary/30',
}
const deployments = [


    {
        id: 1,
        href: '#',
        projectName: 'ios-app',
        teamName: 'Planetaria',
        status: 'offline',
        statusText: 'Initiated 1m 32s ago',
        description: 'Deploys from GitHub',
        environment: 'Preview',
    },
    {
        id: 2,
        href: '#',
        projectName: 'mobile-api',
        teamName: 'Planetaria',
        status: 'online',
        statusText: 'Deployed 3m ago',
        description: 'Deploys from GitHub',
        environment: 'Production',
    },
    {
        id: 3,
        href: '#',
        projectName: 'tailwindcss.com',
        teamName: 'Tailwind Labs',
        status: 'offline',
        statusText: 'Deployed 3h ago',
        description: 'Deploys from GitHub',
        environment: 'Preview',
    },
    {
        id: 4,
        href: '#',
        projectName: 'api.protocol.chat',
        teamName: 'Protocol',
        status: 'error',
        statusText: 'Failed to deploy 6d ago',
        description: 'Deploys from GitHub',
        environment: 'Preview',
    },
]

function ServiceHealthCheck() {
    const [isHealthCheckLoading, setIsHealthCheckLoading] = useState(false);
    const [healthCheckItems, setHealthCheckItems] = useState([]);
    const pathname = usePathname();

    const getServiceHealthCheck = async () => {
        setIsHealthCheckLoading(true);
        try {
            const splitUrl = pathname.split('/');
            const targetLocation = splitUrl[splitUrl.length-1];
            const call = await fetch(`${process.env.NEXT_PUBLIC_API_URL}api/v1/project/${targetLocation}/healthcheck`, {
                method: "GET",
                headers: {
                    'Content-Type': 'application/json',
                },
                mode: "cors",
            });
            let healthCheckItems = await call.json();
            console.log(healthCheckItems);
            setHealthCheckItems(healthCheckItems)

        } catch (e) {
            console.error("Something didn't work", e);
        }

        setIsHealthCheckLoading(false);
    }

    useEffect(() => {
        getServiceHealthCheck().then()
    }, [])

    return (
        <div>
            {isHealthCheckLoading && <LoadingSpinner/>}
            {!isHealthCheckLoading && (
                <>
                    <div className="text-2xl text-slate-200">Service Health Check</div>
                    <ul role="list" className="divide-y divide-white/5">
                        {healthCheckItems?.map((healthCheck, index) => (
                            <li key={index} className="relative flex items-center space-x-4 py-4">
                                <div className="min-w-0 flex-auto">
                                    <div className="flex items-center gap-x-3">
                                        <div className={classNames(statuses[healthCheck.status], 'flex-none rounded-full p-1')}>
                                            <div className="h-2 w-2 rounded-full bg-current" />
                                        </div>
                                        <h2 className="min-w-0 text-sm font-semibold leading-6 text-white">
                                            <a href={"https://"+healthCheck.url} className="flex gap-x-2">
                                                <span className="truncate">{healthCheck.name}</span>
                                                <span className="text-gray-400">/</span>
                                                <span className="whitespace-nowrap">{healthCheck.url}</span>
                                                <span className="absolute inset-0" />
                                            </a>
                                        </h2>
                                    </div>
                                    <div className="mt-3 flex items-center gap-x-2.5 text-xs leading-5 text-gray-400">
                                        <p className="truncate">Deployed from GitHub</p>
                                        <svg viewBox="0 0 2 2" className="h-0.5 w-0.5 flex-none fill-gray-300">
                                            <circle cx={1} cy={1} r={1} />
                                        </svg>
                                        <p className="whitespace-nowrap">Created {new Date(healthCheck.created).toLocaleDateString('en-US', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                        })}</p>
                                    </div>
                                </div>
                                <div
                                    className={classNames(
                                        environments[healthCheck.environment],
                                        'rounded-full flex-none py-1 px-2 text-xs font-medium ring-1 ring-inset'
                                    )}
                                >
                                    {healthCheck.environment}
                                </div>
                                <ChevronRightIcon className="h-5 w-5 flex-none text-gray-400" aria-hidden="true" />
                            </li>
                        ))}
                    </ul>
                </>
            )}

        </div>

    )
}


const activityItems = [


    {
        user: {
            name: 'Michael Foster',
            imageUrl:
                'https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        },
        projectName: 'ios-app',
        commit: '2d89f0c8',
        branch: 'main',
        date: '1h',
        dateTime: '2023-01-23T11:00',
    },
    {
        user: {
            name: 'Lindsay Walton',
            imageUrl:
                'https://images.unsplash.com/photo-1517841905240-472988babdf9?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        },
        projectName: 'mobile-api',
        commit: '249df660',
        branch: 'main',
        date: '3h',
        dateTime: '2023-01-23T09:00',
    },
    {
        user: {
            name: 'Courtney Henry',
            imageUrl:
                'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        },
        projectName: 'ios-app',
        commit: '11464223',
        branch: 'main',
        date: '12h',
        dateTime: '2023-01-23T00:00',
    },
    {
        user: {
            name: 'Courtney Henry',
            imageUrl:
                'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        },
        projectName: 'tailwindui.com',
        commit: 'dad28e95',
        branch: 'main',
        date: '2d',
        dateTime: '2023-01-21T13:00',
    },
    {
        user: {
            name: 'Michael Foster',
            imageUrl:
                'https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        },
        projectName: 'relay-service',
        commit: '624bc94c',
        branch: 'main',
        date: '5d',
        dateTime: '2023-01-18T12:34',
    },
]

function CommitLog({currentProject}) {
    const [isCommitLoading, setCommitLoading] = useState(false);
    const [commits, setCommits] = useState([]);
    const pathname = usePathname();

    const getCommits = async (page = 1) => {
        setCommitLoading(true);
        try {
            let pageAmount = `${parseInt(currentProject?.environmentUrls?.length * (6/7))}`;
            const splitUrl = pathname.split('/');
            const targetLocation = splitUrl[splitUrl.length-1];
            const call = await fetch(`${process.env.NEXT_PUBLIC_API_URL}api/v1/project/${targetLocation}/commits/page/${page}/${pageAmount}`, {
                method: "GET",
                headers: {
                    'Content-Type': 'application/json',
                },
                mode: "cors",
            });
            let newCommits = await call.json();
            setCommits(newCommits)

        } catch (e) {
            console.error("Something didn't work", e);
        }

        setCommitLoading(false);
    }

    useEffect(() => {
        getCommits(1).then()
    }, []);
    
    return (
        <div>
            {!isCommitLoading && (<><div className="text-2xl text-slate-200">Recent Commits</div>
            <ul role="list" className="divide-y divide-white/5">
                {commits?.results?.map((item) => (
                    <li key={item.sha} className="py-4">
                        <div className="flex items-center gap-x-3">
                            <img src={item.userAvatar} alt="" className="h-6 w-6 flex-none rounded-full bg-gray-800" />
                            <a href={item.userUrl}><h3 className="flex-auto truncate text-sm font-semibold leading-6 text-white">{item.userLogin}</h3></a>
                            <time dateTime={item.created} className="flex-none text-xs text-gray-500">
                                {new Date(item.created).toLocaleDateString('en-US', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                })} @ {new Date(item.created).toLocaleTimeString('en-US')}
                            </time>
                        </div>
                        <p className="mt-3 truncate text-sm text-gray-500">
                            <span className="text-slate-400 mr-6"><div className="inline-flex truncate text-ellipsis">{item.message}</div></span>
                            <span className="font-mono text-gray-slate">{item.sha}</span>
                        </p>
                    </li>
                ))}
            </ul></>)}
            {isCommitLoading && <LoadingSpinnerLarge/>}
        </div>
    )
}

const files = [


    {
        title: 'IMG_4985.HEIC',
        size: '3.9 MB',
        source:
            'https://images.unsplash.com/photo-1582053433976-25c00369fc93?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=512&q=80',
    },
    // More files...
]

const activity = [


    { id: 1, type: 'created', person: { name: 'Chelsea Hagon' }, date: '7d ago', dateTime: '2023-01-23T10:32' },
    { id: 2, type: 'edited', person: { name: 'Chelsea Hagon' }, date: '6d ago', dateTime: '2023-01-23T11:03' },
    { id: 3, type: 'sent', person: { name: 'Chelsea Hagon' }, date: '6d ago', dateTime: '2023-01-23T11:24' },
    {
        id: 4,
        type: 'commented',
        person: {
            name: 'Chelsea Hagon',
            imageUrl:
                'https://images.unsplash.com/photo-1550525811-e5869dd03032?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        },
        comment: 'Called client, they reassured me the invoice would be paid by the 25th.',
        date: '3d ago',
        dateTime: '2023-01-23T15:56',
    },
    { id: 5, type: 'viewed', person: { name: 'Alex Curren' }, date: '2d ago', dateTime: '2023-01-24T09:12' },
    { id: 6, type: 'paid', person: { name: 'Alex Curren' }, date: '1d ago', dateTime: '2023-01-24T09:20' },
]
const moods = [


    { name: 'Excited', value: 'excited', icon: FireIcon, iconColor: 'text-white', bgColor: 'bg-red-500' },
    { name: 'Loved', value: 'loved', icon: HeartIcon, iconColor: 'text-white', bgColor: 'bg-pink-400' },
    { name: 'Happy', value: 'happy', icon: FaceSmileIcon, iconColor: 'text-white', bgColor: 'bg-green-400' },
    { name: 'Sad', value: 'sad', icon: FaceFrownIcon, iconColor: 'text-white', bgColor: 'bg-yellow-400' },
    { name: 'Thumbsy', value: 'thumbsy', icon: HandThumbUpIcon, iconColor: 'text-white', bgColor: 'bg-blue-500' },
    { name: 'I feel nothing', value: null, icon: XMarkIcon, iconColor: 'text-gray-400', bgColor: 'bg-transparent' },
]

function ProjectActivityLog({currentProject}) {
    const [selected, setSelected] = useState(moods[5])
    const [isProjectCommentLoading, setIsProjectCommentLoading] = useState(false);
    const [project, setProject] = useState(currentProject);
    const [commentText, setCommentText] = useState('');
    const [user, setUser] = useState(null);

    const { getAccessTokenSilently } = useAuth0();
    const pathname = usePathname();

    const getUser = async () => {
        try {
            const accessToken = await getAccessTokenSilently();
            var call = await fetch(`${process.env.NEXT_PUBLIC_API_URL}api/v1/user`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': "*",
                },
                mode: "cors",
            });
            setUser(await call.json());
        } catch (e) {
            console.error(e);
        }
    }

    const addProjectComment = async () => {
        try {
            setIsProjectCommentLoading(true);
            const accessToken = await getAccessTokenSilently();
            const splitUrl = pathname.split('/');
            const targetLocation = splitUrl[splitUrl.length-1];
            var call = await fetch(`${process.env.NEXT_PUBLIC_API_URL}api/v1/project/${targetLocation}/comment/${commentText}`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                mode: "cors",
            });

            var savedProject = await call.json();
            setProject({...currentProject, activityLogs: savedProject.activityLogs})
            console.log("returned saved project: ", savedProject);
            setCommentText('');
        } catch (e) {
            console.error("Something didn't work", e);
        }

        setIsProjectCommentLoading(false);
    }

    useEffect(() => {
        // set project?
        setProject(currentProject)
    }, [currentProject]);

    useEffect(() => {
        getUser().then();
    }, [])

    function renderIconType(iconType) {
        switch(iconType) {
            case activityLogType.createProject:
                return (<PlusCircleIcon className="h-6 w-6 text-primary" aria-hidden="true" />);
            case activityLogType.addPhoto:
                return (<PhotoIcon className="h-6 w-6 text-primary" aria-hidden="true" />);
            case activityLogType.addMember:
                return (<UserIcon className="h-6 w-6 text-primary" aria-hidden="true" />);
            case activityLogType.addDeployment:
                return (<RocketLaunchIcon className="h-6 w-6 text-primary" aria-hidden="true" />);
            default:
                return (<div className="h-1.5 w-1.5 rounded-full bg-gray-100 ring-1 ring-slate-950" />);
        }
    }

    return (
        <div className="py-10 ml-24 mr-24">
                <h2 className="px-4 text-2xl font-semibold leading-7 text-white sm:px-6 lg:px-8">Activity Log</h2>

                <ul role="list" className="space-y-6 mt-6 whitespace-nowrap text-left ml-8 mr-8 ">
                    {project?.activityLogs?.map((activityItem, activityItemIdx) => (
                        <li key={activityItem.id} className="relative flex gap-x-4">
                            <div
                                className={classNames(
                                    activityItemIdx === project?.activityLogs?.length - 1 ? 'h-6' : '-bottom-6',
                                    'absolute left-0 top-0 flex w-6 justify-center'
                                )}
                            >
                                <div className="w-px bg-slate-600" />
                            </div>
                            {activityItem.type === activityLogType.comment ? (
                                <>
                                    <img
                                        src={activityItem.user.avatar}
                                        alt=""
                                        className="relative mt-3 h-6 w-6 flex-none rounded-full bg-gray-50"
                                    />
                                    <div className="flex-auto rounded-md p-3 ring-1 ring-inset ring-slate-600">
                                        <div className="flex justify-between gap-x-4">
                                            <div className="py-0.5 text-xs leading-5 text-slate-400">
                                                <span className="font-medium text-slate-200">{activityItem.user.firstName} {activityItem.user.lastName}</span> commented
                                            </div>
                                            <time dateTime={activityItem.created} className="flex-none py-0.5 text-xs leading-5 text-slate-400">
                                                {new Date(activityItem.created).toLocaleDateString('en-US', {
                                                    day: 'numeric',
                                                    month: 'long',
                                                    year: 'numeric',
                                                })} @ {new Date(activityItem.created).toLocaleTimeString('en-US')}
                                            </time>
                                        </div>
                                        <p className="text-sm leading-6 text-slate-300">{activityItem.text}</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="relative flex h-6 w-6 flex-none items-center justify-center bg-slate-900">
                                        {renderIconType(activityItem.type)}
                                    </div>
                                    <p className="flex-auto py-0.5 text-xs leading-5 text-slate-400">
                                        <span className="font-medium text-slate-200">{activityItem.user.firstName} {activityItem.user.lastName}</span> {activityItem.text}
                                    </p>
                                    <time dateTime={activityItem.created} className="flex-none py-0.5 text-xs leading-5 text-slate-300">
                                        {new Date(activityItem.created).toLocaleDateString('en-US', {
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric',
                                            })} @ {new Date(activityItem.created).toLocaleTimeString('en-US')}
                                    </time>
                                </>
                            )}
                        </li>
                    ))}
                </ul>

                <div className="mt-6 flex gap-x-3">
                    {user && (<img
                        src={user?.avatar}
                        alt=""
                        className="h-6 w-6 flex-none rounded-full bg-slate-900"
                    />)}
                    <form action="#" className="relative flex-auto">
                        <div className={clsx("overflow-hidden rounded-lg pb-12 shadow-sm ring-1 ring-inset ring-primary-600 focus-within:ring-2 focus-within:ring-primary", user ? "" : "ml-6")}>
                            <label htmlFor="comment" className="sr-only">
                                Add your comment
                            </label>
                            <textarea
                                rows={2}
                                name="comment"
                                id="comment"
                                value={commentText || ""}
                                onChange={(e) => setCommentText(e.target.value)}
                                className="block w-full resize-none border-0 bg-transparent py-1.5 text-slate-200 placeholder:text-slate-400 focus:ring-0 sm:text-sm sm:leading-6"
                                placeholder="Add your comment..."
                                defaultValue={''}
                            />
                        </div>

                        <div className={clsx("absolute inset-x-0 bottom-0 flex justify-between py-2 pr-2", user ? "pl-3" : "pl-10" )}>
                            <div className="flex items-center space-x-5">
                                <div className="flex items-center">
                                    <button
                                        type="button"
                                        className="-m-2.5 flex h-10 w-10 items-center justify-center rounded-full text-gray-300 hover:text-slate-400"
                                    >
                                        <PaperClipIcon className="h-5 w-5" aria-hidden="true" />
                                        <span className="sr-only">Attach a file</span>
                                    </button>
                                </div>
                                <div className="flex items-center">
                                    <Listbox value={selected} onChange={setSelected}>
                                        {({ open }) => (
                                            <>
                                                <Listbox.Label className="sr-only">Your mood</Listbox.Label>
                                                <div className="relative">
                                                    <Listbox.Button className="relative -m-2.5 flex h-10 w-10 items-center justify-center rounded-full text-gray-400 hover:text-gray-500">
                          <span className="flex items-center justify-center">
                            {selected.value === null ? (
                                <span>
                                <FaceSmileIcon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                                <span className="sr-only">Add your mood</span>
                              </span>
                            ) : (
                                <span>
                                <span
                                    className={classNames(
                                        selected.bgColor,
                                        'flex h-8 w-8 items-center justify-center rounded-full'
                                    )}
                                >
                                  <selected.icon className="h-5 w-5 flex-shrink-0 text-white" aria-hidden="true" />
                                </span>
                                <span className="sr-only">{selected.name}</span>
                              </span>
                            )}
                          </span>
                                                    </Listbox.Button>

                                                    <Transition
                                                        show={open}
                                                        as={Fragment}
                                                        leave="transition ease-in duration-100"
                                                        leaveFrom="opacity-100"
                                                        leaveTo="opacity-0"
                                                    >
                                                        <Listbox.Options className="absolute bottom-10 z-10 -ml-6 w-60 rounded-lg bg-slate-950 py-3 text-base shadow ring-1 ring-black ring-opacity-5 focus:outline-none sm:ml-auto sm:w-64 sm:text-sm">
                                                            {moods.map((mood) => (
                                                                <Listbox.Option
                                                                    key={mood.value}
                                                                    className={({ active }) =>
                                                                        classNames(
                                                                            active ? 'bg-slate-700' : 'bg-slate-950',
                                                                            'relative cursor-default select-none px-3 py-2'
                                                                        )
                                                                    }
                                                                    value={mood}
                                                                >
                                                                    <div className="flex items-center">
                                                                        <div
                                                                            className={classNames(
                                                                                mood.bgColor,
                                                                                'flex h-8 w-8 items-center justify-center rounded-full'
                                                                            )}
                                                                        >
                                                                            <mood.icon
                                                                                className={classNames(mood.iconColor, 'h-5 w-5 flex-shrink-0')}
                                                                                aria-hidden="true"
                                                                            />
                                                                        </div>
                                                                        <span className="ml-3 block truncate font-medium text-slate-200">{mood.name}</span>
                                                                    </div>
                                                                </Listbox.Option>
                                                            ))}
                                                        </Listbox.Options>
                                                    </Transition>
                                                </div>
                                            </>
                                        )}
                                    </Listbox>
                                </div>
                            </div>
                            <button
                                type="button"
                                disabled={!user}
                                onClick={() => addProjectComment()}
                                className="rounded-md px-2.5 py-1.5 text-sm font-semibold text-slate-200 shadow-sm ring-1 ring-inset ring-secondary hover:bg-slate-950 disabled:cursor-not-allowed disabled:bg-slate-950"
                            >
                                {isProjectCommentLoading && <LoadingSpinner/>}
                                {!isProjectCommentLoading && <div>Comment</div>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

    )
}

const deployment_statuses = {
    Success: 'text-green-400 bg-green-400/10',
    Failure: 'text-rose-400 bg-rose-400/10',
    Cancelled: 'text-yellow-400 bg-yellow-400/10',
    Neutral: 'text-slate-400 bg-slate-400/10',
}
const activityItems2 = [


    {
        user: {
            name: 'Michael Foster',
            imageUrl:
                'https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        },
        commit: '2d89f0c8',
        branch: 'main',
        status: 'Completed',
        duration: '25s',
        date: '45 minutes ago',
        dateTime: '2023-01-23T11:00',
    },
    {
        user: {
            name: 'Lindsay Walton',
            imageUrl:
                'https://images.unsplash.com/photo-1517841905240-472988babdf9?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        },
        commit: '249df660',
        branch: 'main',
        status: 'Completed',
        duration: '1m 32s',
        date: '3 hours ago',
        dateTime: '2023-01-23T09:00',
    },
    {
        user: {
            name: 'Courtney Henry',
            imageUrl:
                'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        },
        commit: '11464223',
        branch: 'main',
        status: 'Error',
        duration: '1m 4s',
        date: '12 hours ago',
        dateTime: '2023-01-23T00:00',
    },
    {
        user: {
            name: 'Courtney Henry',
            imageUrl:
                'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        },
        commit: 'dad28e95',
        branch: 'main',
        status: 'Completed',
        duration: '2m 15s',
        date: '2 days ago',
        dateTime: '2023-01-21T13:00',
    },
    {
        user: {
            name: 'Michael Foster',
            imageUrl:
                'https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        },
        commit: '624bc94c',
        branch: 'main',
        status: 'Completed',
        duration: '1m 12s',
        date: '5 days ago',
        dateTime: '2023-01-18T12:34',
    },
    {
        user: {
            name: 'Courtney Henry',
            imageUrl:
                'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        },
        commit: 'e111f80e',
        branch: 'main',
        status: 'Completed',
        duration: '1m 56s',
        date: '1 week ago',
        dateTime: '2023-01-16T15:54',
    },
    {
        user: {
            name: 'Michael Foster',
            imageUrl:
                'https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        },
        commit: '5e136005',
        branch: 'main',
        status: 'Completed',
        duration: '3m 45s',
        date: '1 week ago',
        dateTime: '2023-01-16T11:31',
    },
    {
        user: {
            name: 'Whitney Francis',
            imageUrl:
                'https://images.unsplash.com/photo-1517365830460-955ce3ccd263?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        },
        commit: '5c1fd07f',
        branch: 'main',
        status: 'Completed',
        duration: '37s',
        date: '2 weeks ago',
        dateTime: '2023-01-09T08:45',
    },
]

function DeploymentLog() {

    const [currentPage, setCurrentPage] = useState(1);
    const [isDeploymentLoading, setDeploymentLoading] = useState(false);
    const [deployments, setDeployments] = useState([]);
    const [currentPageArray, setPageArray] = useState([]);
    const pathname = usePathname();

    const getDeployments = async (page = 1) => {
        setDeploymentLoading(true);
        try {
            const splitUrl = pathname.split('/');
            const targetLocation = splitUrl[splitUrl.length-1];
            const call = await fetch(`${process.env.NEXT_PUBLIC_API_URL}api/v1/project/${targetLocation}/deployments/page/${page}`, {
                method: "GET",
                headers: {
                    'Content-Type': 'application/json',
                },
                mode: "cors",
            });
            let newDeployments = await call.json();
            setDeployments(newDeployments)

        } catch (e) {
            console.error("Something didn't work", e);
        }

        setDeploymentLoading(false);
    }

    const clickPage = (page) => {
        getDeployments(page)
            .then(() => setCurrentPage(page));
    }

    const previousPage = () => {
        getDeployments(currentPage-1)
            .then(() => setCurrentPage(currentPage-1));
    }

    const nextPage = () => {
        getDeployments(currentPage+1)
            .then(() => setCurrentPage(currentPage+1));
    }

    useEffect(() => {
        getDeployments(1).then()
    }, []);

    useEffect(() => {
        let showMin = true;
        let showMax = true;

        if (currentPage+3 >= deployments.totalPages){
            showMax = false;
        }

        if (currentPage-3 <= 1)
        {
            showMin = false;
        }

        let ret = [];
        if (showMin)
        {
            ret.push(1);
            ret.push(null);
        }

        for (let x = currentPage - 2; x <= currentPage + 2; x++)
        {
            if (x >= 1 && x <= deployments.totalPages)
                ret.push(x);
        }

        if(showMax)
        {
            ret.push(null);
            ret.push(deployments.totalPages);
        }

        setPageArray(ret);
    }, [deployments]);

    return (
        <div className="py-6 ml-24 mr-24">
            <h2 className="px-4 text-2xl font-semibold leading-7 text-white sm:px-6 lg:px-8">GitHub Deployment History</h2>
            {!isDeploymentLoading && (<>
                <table className="mt-6 whitespace-nowrap text-left ml-8 mr-8 ">
                <colgroup>
                    <col className="w-full sm:w-4/12" />
                    <col className="lg:w-4/12" />
                    <col className="lg:w-2/12" />
                    <col className="lg:w-1/12" />
                    <col className="lg:w-1/12" />
                </colgroup>
                <thead className="border-b border-white/10 text-sm leading-6 text-white">
                <tr>
                    <th scope="col" className="py-2 pl-4 pr-8 font-semibold sm:pl-6 lg:pl-8">
                        User
                    </th>
                    <th scope="col" className="hidden py-2 pl-0 pr-8 font-semibold sm:table-cell">
                        Commit
                    </th>
                    <th scope="col" className="py-2 pl-0 pr-4 text-right font-semibold sm:pr-8 sm:text-left lg:pr-20">
                        Status
                    </th>
                    <th scope="col" className="hidden py-2 pl-0 pr-8 font-semibold md:table-cell lg:pr-20">
                        Duration
                    </th>
                    <th scope="col" className="hidden py-2 pl-0 pr-4 text-right font-semibold sm:table-cell sm:pr-6 lg:pr-8">
                        Deployed at
                    </th>
                </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                {deployments?.results?.map((item) => (
                    <tr key={item.sha}>
                        <td className="py-4 pl-4 pr-8 sm:pl-6 lg:pl-8">
                            <div className="flex items-center gap-x-4">
                                <img src={item.userAvatar} alt="" className="h-8 w-8 rounded-full bg-gray-800" />
                                <a className="truncate text-sm font-medium leading-6 text-white" href={item.userUrl}>{item.userLogin}</a>
                            </div>
                        </td>
                        <td className="hidden py-4 pl-0 pr-4 sm:table-cell sm:pr-8">
                            <div className="flex gap-x-3">
                                <div className="font-mono text-sm leading-6 text-gray-400 truncate text-ellipsis w-24">{item.sha}</div>
                                <div className="rounded-md bg-gray-700/40 px-2 py-1 text-xs font-medium text-gray-400 ring-1 ring-inset ring-white/10">
                                    {item.branch}
                                </div>
                            </div>
                        </td>
                        <td className="py-4 pl-0 pr-4 text-sm leading-6 sm:pr-8 lg:pr-20">
                            <div className="flex items-center justify-end gap-x-2 sm:justify-start">
                                <time className="text-gray-400 sm:hidden" dateTime={item.created}>
                                    {item.created}
                                </time>
                                <div className={classNames(deployment_statuses[item.conclusion], 'flex-none rounded-full p-1')}>
                                    <div className="h-1.5 w-1.5 rounded-full bg-current" />
                                </div>
                                <div className="hidden text-white sm:block">{item.conclusion}</div>
                            </div>
                        </td>
                        <td className="hidden py-4 pl-0 pr-8 text-sm leading-6 text-gray-400 md:table-cell lg:pr-20">
                            {item.duration.replace('00:0', '').replace('00:', '')} min
                        </td>
                        <td className="hidden py-4 pl-0 pr-4 text-right text-sm leading-6 text-gray-400 sm:table-cell sm:pr-6 lg:pr-8">
                            <time dateTime={item.created}>{new Date(item.created).toLocaleDateString('en-US', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                            })} @ {new Date(item.created).toLocaleTimeString('en-US')}</time>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
            <nav className="flex items-center justify-between border-t border-slate-800 px-4">
                <div className="-mt-px flex w-0 flex-1">
                    <a
                        href="#"
                        onClick={() => previousPage()}
                        className="inline-flex items-center border-t-2 border-transparent pr-1 pt-4 text-sm font-medium text-slate-300 hover:border-slate-700 hover:text-slate-100"
                    >
                        <ArrowLongLeftIcon className="mr-3 h-5 w-5 text-slate-300" aria-hidden="true" />
                        Previous
                    </a>
                </div>

                <div className="hidden md:-mt-px md:flex">
                {currentPageArray.map(x => {
                    if (x===null)
                        return (<span className="inline-flex items-center border-t-2 border-transparent px-4 pt-4 text-sm font-medium text-slate-400">...</span>)
                    else if(x===currentPage)
                        return (
                            <a
                                href="#"
                                onClick={() => clickPage(x)}
                                aria-current="page"
                                className="inline-flex items-center border-t-2 border-primary px-4 pt-4 text-sm font-medium text-tertiary"
                            >
                                {x}
                            </a>
                        )
                    else
                        return (
                            <a
                                href="#"
                                onClick={() => clickPage(x)}
                                className="inline-flex items-center border-t-2 border-transparent px-4 pt-4 text-sm font-medium text-slate-300 hover:border-slate-700 hover:text-slate-100"
                            >
                                {x}
                            </a>
                        )
                })}
                </div>

                <div className="-mt-px flex w-0 flex-1 justify-end">
                    <a
                        href="#"
                        onClick={() => nextPage()}
                        className="inline-flex items-center border-t-2 border-transparent pl-1 pt-4 text-sm font-medium text-slate-300 hover:border-slate-700 hover:text-slate-100"
                    >
                        Next
                        <ArrowLongRightIcon className="ml-3 h-5 w-5 text-slate-300" aria-hidden="true" />
                    </a>
                </div>
            </nav>
            </>)}
            {isDeploymentLoading && <LoadingSpinnerLarge/>}

        </div>
    )
}


const secondaryProjectsNavigation = [ 'Details', 'Deployments', 'Members', 'Activity Log', 'Photos', 'Edit'];

export default function Project({ params }) {
    const [selectedTab, selectTab] = useState(secondaryProjectsNavigation[0]);

    const { user, getAccessTokenSilently } = useAuth0();
    const pathname = usePathname();
    const [project, setProject] = useState(null);
    const [isProjectLoading, setProjectLoading] = useState(true);
    const [isProjectImageLoading, setIsProjectImageLoading] = useState(false);

    const getProject = async () => {
        setProjectLoading(true);
        try {
            const splitUrl = pathname.split('/');
            const targetLocation = splitUrl[splitUrl.length-1];
            console.log("PATHNAME", targetLocation);
            const call = await fetch(`${process.env.NEXT_PUBLIC_API_URL}api/v1/project/${targetLocation}`, {
                method: "GET",
                headers: {
                    'Content-Type': 'application/json',
                },
                mode: "cors",
            });
            let projects = await call.json();
            console.log("Project: ", projects);
            if (projects.status == 404) {
                setProjectLoading(false);
                return;
            }
            setProject(projects);
            setProjectLoading(false);
        } catch (e) {
            console.error("Something didn't work", e);
            setProjectLoading(false);
        }
    }

    const addProjectPhoto = async (base64) => {
        try {
            setIsProjectImageLoading(true);
            const accessToken = await getAccessTokenSilently();
            const splitUrl = pathname.split('/');
            const targetLocation = splitUrl[splitUrl.length-1];
            let body = JSON.stringify({
                id: null,
                isDeleted: false,
                fileName: image.name,
                size: `${image.size}`,
                base64: base64
            });
            var call = await fetch(`${process.env.NEXT_PUBLIC_API_URL}api/v1/project/${targetLocation}/photo`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                mode: "cors",
                body: body,
            });

            var savedProject = await call.json();
            setProject({...currentProject, repository: savedProject.repository})
            console.log("returned saved project: ", savedProject);
        } catch (e) {
            console.error("Something didn't work", e);
        }

        setIsProjectImageLoading(false);
    }

    useEffect(() => {
        getProject().then()
    }, [pathname])

    const getUrls = (id) => {
        const filtered = project.environmentUrls?.filter(x => !x.isDeleted && x.environmentId == id);
        return filtered.map((url, index) => (
            <>{url.url} {(index <= (filtered.length - 2)) ? "/ " : ""}</>
        ));
    }

    const environmentColor = (env) => {
        switch(env) {
            case "Dev":
            case "dev":
                return 'bg-indigo-700';
            case "Test":
            case "test":
                return 'bg-yellow-600';
            case "UAT":
            case "uat":
            case "Uat":
                return 'bg-green-700';
            case "Stage":
            case "stage":
                return 'bg-primary';
            case "prod":
            case "Prod":
            case "production":
            case "Production":
                return 'bg-tertiary';
        }
        return '';
    }

    const [image, setImage] = useState(null);
    const inputFile = useRef(null);


    const handleFileUpload = e => {
        const { files } = e.target;
        if (files && files.length) {
            const filename = files[0].name;

            var parts = filename.split(".");

            setImage(files[0]);
        }
    };


    useEffect(() => {
        if (image)
        {
            let reader = new FileReader();
            reader.readAsDataURL(image);
            reader.onload = () => {
                addProjectPhoto(reader.result).then(() => getProject().then())
            };
        }
    }, [image])

    function clickTab (itemName) {
        selectTab(itemName);
    }

    return (
        <>
            <AccountLayout>
                <header className="border-b border-white/5">
                    {/* Secondary navigation */}
                    <nav className="flex overflow-x-auto py-4">
                        <ul
                            role="list"
                            className="flex min-w-full flex-none gap-x-6 px-4 text-sm font-semibold leading-6 text-gray-400 sm:px-6 lg:px-8"
                        >
                            {secondaryProjectsNavigation.map((item) => (
                                <li key={item}>
                                    <a href="#" onClick={() => clickTab(item)} className={item == selectedTab ? 'text-primary' : ''}>
                                        {item}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </header>

                {isProjectLoading ? <div className="py-10"><LoadingSpinnerLarge/></div> : (project ?
                        <>
                            {selectedTab == "Details" && (
                                <>
                                    <div className="py-10 ml-24 mr-24">
                                        <h2 className="px-4 text-2xl font-semibold leading-7 text-white sm:px-6 lg:px-8">{project.name}</h2>

                                        <div className="p-12 pb-8">
                                            <h2 className="text-sm font-medium text-slate-300">Deployed Environments</h2>
                                            <ul role="list" className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-2">
                                                {project.environments?.map((environment) => (
                                                    <li key={environment} className="col-span-1 flex rounded-md shadow-sm">
                                                        <div
                                                            className={classNames(
                                                                environmentColor(environment.name),
                                                                'flex w-24 h-24 flex-shrink-0 items-center justify-center rounded-l-md text-sm font-medium text-white'
                                                            )}
                                                        >
                                                            {environment.name}
                                                        </div>
                                                        <div className="flex flex-1 text-ellipsis items-center justify-between rounded-r-md border-b border-r border-t border-slate-950 bg-slate-950">
                                                            <div className="flex-1 px-4 py-2 text-sm ">
                                                                <a href="#" className="font-medium text-slate-300 hover:text-slate-100">
                                                                    {environment.name} Environment
                                                                </a>
                                                                <p className="text-slate-400">{getUrls(environment.id)}</p>
                                                            </div>
                                                            <div className="flex-shrink-0 pr-6">
                                                                <Menu as="div" className="relative flex-none">
                                                                    <Menu.Button disabled={!user} className="-m-2.5 block p-2.5 text-slate-400 hover:text-slate-100 disabled:cursor-not-allowed">
                                                                        <span className="sr-only">Open options</span>
                                                                        <EllipsisVerticalIcon className="h-5 w-5" aria-hidden="true" />
                                                                    </Menu.Button>
                                                                    <Transition
                                                                        as={Fragment}
                                                                        enter="transition ease-out duration-100"
                                                                        enterFrom="transform opacity-0 scale-95"
                                                                        enterTo="transform opacity-100 scale-100"
                                                                        leave="transition ease-in duration-75"
                                                                        leaveFrom="transform opacity-100 scale-100"
                                                                        leaveTo="transform opacity-0 scale-95"
                                                                    >
                                                                        <Menu.Items className="absolute right-0 z-10 mt-2 w-64 origin-top-right rounded-md bg-slate-700 py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none">
                                                                            <Menu.Item>
                                                                                {({ active }) => (
                                                                                    <a
                                                                                        href="#"
                                                                                        className={classNames(
                                                                                            active ? 'bg-slate-600' : '',
                                                                                            'block px-3 py-1 text-sm leading-6 text-slate-300'
                                                                                        )}
                                                                                    >
                                                                                        View Environment
                                                                                    </a>
                                                                                )}
                                                                            </Menu.Item>
                                                                        </Menu.Items>
                                                                    </Transition>
                                                                </Menu>
                                                            </div>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        {/*<ProjectDetails/>*/}

                                        <div className="grid grid-cols-2 gap-x-32 ml-8 mr-8 mt-8">
                                            <CommitLog currentProject={project}/>
                                            <ServiceHealthCheck/>
                                        </div>

                                    </div>
                                </>
                            )}

                            {selectedTab == "Activity Log" && (
                                <>
                                    <ProjectActivityLog currentProject={project}/>
                                </>
                            )}

                            {selectedTab == "Deployments" && (
                                <>
                                    <DeploymentLog/>
                                </>
                            )}

                            {selectedTab == "Members" && (
                                <>
                                    <MembersList currentProject={project}/>
                                </>
                            )}

                            {selectedTab == "Edit" && (
                                <>
                                    <EditProject currentProject={project}/>
                                </>
                            )}

                            {selectedTab == "Photos" && (
                                <>
                                    <div className="ml-32 mr-32 mt-16">
                                        <ul role="list" className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4 xl:gap-x-8">
                                            {project?.photos?.map((photo) => (
                                                <li key={photo.id} className="relative">
                                                    <div className="group aspect-h-7 aspect-w-10 block w-full overflow-hidden rounded-lg bg-gray-100 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 focus-within:ring-offset-gray-100">
                                                        <img src={photo.base64} alt="" className="pointer-events-none object-cover group-hover:opacity-75" />
                                                        <button type="button" className="absolute inset-0 focus:outline-none">
                                                            <span className="sr-only">View details for {photo.fileName}</span>
                                                        </button>
                                                    </div>
                                                    <p className="pointer-events-none mt-2 block truncate text-sm font-medium text-slate-400">{photo.fileName}</p>
                                                    <p className="pointer-events-none block text-sm font-medium text-slate-500 mb-16">{photo.size} Bytes</p>
                                                </li>
                                            ))}
                                        </ul>
                                        <label htmlFor="cover-photo" className="block text-sm font-medium leading-6 text-white">
                                            Add a Project Photo
                                        </label>
                                        <div className={clsx("mt-2 flex justify-center rounded-lg border border-dashed border-white/25 px-6 py-10", user ? "" : "cursor-not-allowed")}>
                                            <div className="text-center">
                                                <PhotoIcon className="mx-auto h-12 w-12 text-gray-500" aria-hidden="true" />
                                                <div className="mt-4 flex text-sm leading-6 text-gray-400">
                                                    <label
                                                        htmlFor="file-upload"
                                                        className={clsx("relative pl-2 pr-2 cursor-pointer rounded-md bg-slate-950 font-semibold text-white focus-within:outline-none focus-within:ring-2 focus-within:ring-tertiary focus-within:ring-offset-2 focus-within:ring-offset-slate-950 hover:text-primary", user ? "" : "cursor-not-allowed")}
                                                    >
                                                        <span className={user ? "" : "cursor-not-allowed"}>Upload a file</span>
                                                        <input id="file-upload" disabled={!(user?.isAdmin == true)} name="file-upload" ref={inputFile} accept="image/*" onChange={handleFileUpload} type="file" className="sr-only" />
                                                    </label>
                                                    <p className="pl-1">or drag and drop</p>
                                                </div>
                                                <p className="text-xs leading-5 text-gray-400">PNG, JPG, GIF up to 10MB</p>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </> : <ProjectNotFound/>)}



            </AccountLayout>
        </>
    )
}