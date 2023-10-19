import {Fragment, useEffect} from 'react'
import { Menu, Transition } from '@headlessui/react'
import {useState} from "react";
import {useAuth0} from "@auth0/auth0-react";
import {Button} from "@/components/Button";
import {usePathname} from "next/navigation";
import {EllipsisVerticalIcon} from "@heroicons/react/24/solid";
import {Reply, User, UserComment} from "@/data/Comment";

// todo: Change to TYPE
function IndentLevel(level: number)
{
    let mlSize = 0;

    switch (level){
        case 1:
            mlSize = 0;
            break;
        case 2:
            mlSize = 6;
            break;
    }

    console.log(`ml-${mlSize}`)

    return `ml-${mlSize}`;
}

function ReplyBox(
    {
        comment,
        parentComment,
        id,
        isChild,
        handleParentReply,
        setComment
    }: {
        comment: any,
        parentComment: any,
        id: string,
        isChild: boolean,
        handleParentReply: (comment: unknown) => void,
        setComment: (comment: unknown) => void}
) {
    const [commentText, setCommentText] = useState(isChild ? `@${comment.author.firstName} ` : '');

    const { getAccessTokenSilently } = useAuth0();
    const pathname = usePathname()
    const addReply = async () => {
        try {
            const accessToken = await getAccessTokenSilently();
            const splitUrl = pathname.split('/');
            const targetLocation = splitUrl[splitUrl.length-1];
            const call = await fetch(`https://localhost:5003/api/v1/comment/${targetLocation}/reply/${id}`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    commentText
                }),
                mode: "cors",
            });
            let userReply = await call.json() as Reply;

            if (isChild) {
                parentComment.replies.push(userReply);
                handleParentReply({...parentComment})
            }
            else {
                comment.replies.push(userReply);
                setComment({...comment});
            }
            console.log("new", comment);
            setCommentText("");
        } catch (e) {
            console.error("Something didn't work", e);
        }
    };

    let className = isChild ? "mb-6 mt-6" : "mb-6 ml-6 mt-6 lg:ml-12";

    return (
            <div className={className}>
                <div
                    className="py-2 px-4 mb-4 bg-white rounded-lg rounded-t-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                    <label htmlFor="comment" className="sr-only">Your comment</label>
                    <textarea id="reply" rows={6} value={commentText}
                              className="px-0 w-full text-sm text-gray-900 border-0 focus:ring-0 focus:outline-none dark:text-white dark:placeholder-gray-400 dark:bg-gray-800"
                              onChange={(e) => setCommentText(e.target.value)}
                              placeholder="Write a comment..."  required></textarea>
                </div>
                <button className="inline-flex items-center py-2.5 px-4 text-xs font-medium text-center text-white bg-primary-700 rounded-lg focus:ring-4 focus:ring-primary-200 dark:focus:ring-primary-900 hover:bg-primary-800"
                        type="button"
                        onClick={async () => await addReply()}>
                    Post comment
                </button>
            </div>
    )
}

export function Comment({user, seedComment, parentComment, parentId, isChild, setParentReply}: {user: User, comment: any, parentComment: any, parentId: string, isChild: boolean, setParentReply: (comment: any) => void}) {

    const [clickToggled, setClickToggled] = useState(false);
    const [comment, setComment] = useState(seedComment);

    const { getAccessTokenSilently } = useAuth0();
    const deleteComment = async () => {
        try {
            const accessToken = await getAccessTokenSilently();

            const call = await fetch(`https://localhost:5003/api/v1/comment/${comment.id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                mode: "cors",
            });

            let deletedComment = await call.json() as Reply;

            if (isChild) {
                parentComment.replies = parentComment.replies.filter(x => x.id != deletedComment.id);
                setParentReply({...parentComment})
            }
            else {
                setComment(null);
            }
            console.log("deleted", comment);
        } catch (e) {
            console.error("Something didn't work", e);
        }
    };

    const handleNewReply = (comment) => {
        setClickToggled(false);
        setComment(comment);
    }

    return comment && comment?.author && (
        <>
            <div className={IndentLevel(isChild ? 2 : 1)}>
                <div className="mb-2 pb-2 pt-2 mt-2">
                    <article className={(comment && (comment.author.isAdmin || comment.author.isOwner))
                        ? "text-base bg-slate-700 rounded-lg p-4"
                        : "text-base rounded-lg p-4"}>
                        <footer className="flex justify-between items-center mb-2">
                            <div className="flex items-center">
                                <p className="inline-flex items-center mr-3 text-sm text-gray-900 dark:text-white font-semibold">
                                    <img
                                        className="mr-2 w-6 h-6 rounded-full"
                                        src={comment.author.avatar}
                                        alt={comment.author.name}/>{comment.author.firstName + " " + comment.author.lastName}

                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    <time dateTime="2022-02-08"
                                          title="February 8th, 2022">Feb. 8, 2022
                                    </time>
                                </p>
                            </div>

                            {(user?.id == comment.author.id || user?.isAdmin || user?.isOwner) && (
                                <Menu as="div" className="relative flex-none">
                                    <Menu.Button className="-m-2.5 block p-2.5 text-slate-500 hover:text-slate-300">
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
                                        <Menu.Items className="absolute right-0 z-10 mt-2 w-32 origin-top-right rounded-md bg-slate-700 py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none">
                                            <Menu.Item>
                                                {({ active }) => (
                                                    <a
                                                        href="#"
                                                        className={classNames(
                                                            active ? 'bg-slate-500' : '',
                                                            'block px-3 py-1 text-sm leading-6 text-slate-300'
                                                        )}
                                                    >
                                                        Edit<span className="sr-only">, {comment.author.firstName + " " + comment.author.lastName}</span>
                                                    </a>
                                                )}
                                            </Menu.Item>
                                            <Menu.Item>
                                                {({ active }) => (
                                                    <a
                                                        href="#"
                                                        className={classNames(
                                                            active ? 'bg-slate-500' : '',
                                                            'block px-3 py-1 text-sm leading-6 text-slate-300'
                                                        )}
                                                    >
                                                        Move<span className="sr-only">, {comment.author.firstName + " " + comment.author.lastName}</span>
                                                    </a>
                                                )}
                                            </Menu.Item>
                                            <Menu.Item>
                                                {({ active }) => (
                                                    <button
                                                        type="button"
                                                        href="#"
                                                        className={classNames(
                                                            active ? 'bg-slate-500' : '',
                                                            'block px-3 py-1 text-sm leading-6 text-slate-300'
                                                        )}
                                                        onClick={async () => await deleteComment()}
                                                    >
                                                        Delete<span className="sr-only">, {comment.author.firstName + " " + comment.author.lastName}</span>
                                                    </button>
                                                )}
                                            </Menu.Item>
                                        </Menu.Items>
                                    </Transition>
                                </Menu>
                            )}
                        </footer>
                        <p className="text-gray-500 dark:text-gray-400">{comment.commentText}</p>
                        <div className="flex items-center mt-4 space-x-4">
                            <button type="button"
                                    className="flex items-center text-sm text-gray-500 hover:underline dark:text-gray-400 font-medium"
                                    onClick={() => {
                                        setClickToggled(!clickToggled)
                                    }}>
                                <svg className="mr-1.5 w-3.5 h-3.5" aria-hidden="true"
                                     xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 18">
                                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
                                          stroke-width="2"
                                          d="M5 5h5M5 8h2m6-3h2m-5 3h6m2-7H2a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3v5l5-5h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1Z"/>
                                </svg>
                                Reply
                            </button>
                        </div>
                    </article>
                    {clickToggled && <ReplyBox id={isChild ? parentId : comment.id} parentComment={parentComment} comment={comment} isChild={isChild} handleParentReply={(comment) => {
                        setClickToggled(false);
                        setParentReply(comment);
                    }} setComment={handleNewReply}/>}
                    {
                        (!isChild && comment?.replies?.length > 0) && (
                            comment.replies.map(reply => {
                                return (
                                    <Comment user={user} seedComment={reply} key={reply.id} parentComment={comment} setParentReply={handleNewReply} parentId={comment.id} isChild/>
                                )
                            })
                        )
                    }
                </div>
            </div>

        </>
    )
}

function classNames(...classes: any[]) {
    return classes.filter(Boolean).join(' ')
}