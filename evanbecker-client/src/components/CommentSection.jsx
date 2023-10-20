import { Comment } from "@/components/Comment";
import {User, UserComment} from "@/data/Comment";
import {usePathname} from "next/navigation";
import {useAuth0} from "@auth0/auth0-react";
import {useEffect, useState} from "react";
import LoadingSpinnerLarge from "@/components/LoadingSpinnerLarge";
import LoadingSpinner from "@/components/LoadingSpinner";

export function CommentSection() {
    const [comments, setComments] = useState(null);
    const [user, setUser] = useState(null);
    const [commentText, setCommentText] = useState("");

    const pathname = usePathname();
    const { getAccessTokenSilently } = useAuth0();
    const addComment = async () => {
        try {
            const accessToken = await getAccessTokenSilently();
            const splitUrl = pathname.split('/');
            const targetLocation = splitUrl[splitUrl.length-1];
            var call = await fetch(`https://localhost:5003/api/v1/comment/${targetLocation}`, {
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
            let userComment = await call.json();
            setComments([...comments, userComment]);
            setCommentText("");
        } catch (e) {
            console.error("Something didn't work", e);
        }
    };

    const getComments = async () => {
        try {
            const accessToken = await getAccessTokenSilently();
            const splitUrl = pathname.split('/');
            const targetLocation = splitUrl[splitUrl.length-1];
            var call = await fetch(`https://localhost:5003/api/v1/comment/${targetLocation}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                mode: "cors",
            });
            setComments(await call.json());
        } catch {
            setComments(["Something didn't work"]);
        }
    };

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
        getUser().then()
        getComments().then()
    }, [])

    return (
        <>
            <section className="py-8 lg:py-16 antialiased">
                <div className="max-w-2xl mx-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg lg:text-2xl font-bold text-gray-900 dark:text-white inline-flex">Leave a comment!</h2>
                    </div>
                    <form className="mb-6">
                        <div
                            className="py-2 px-4 mb-4 bg-white rounded-lg rounded-t-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                            <label htmlFor="comment" className="sr-only">Your comment</label>
                            <textarea id="comment" rows={6} value={commentText}
                                      className="px-0 w-full text-sm text-gray-900 border-0 focus:ring-0 focus:outline-none dark:text-white dark:placeholder-gray-400 dark:bg-gray-800"
                                      onChange={(e) => setCommentText(e.target.value)}
                                      placeholder="Write a comment..." required></textarea>
                        </div>
                        <button type="button"
                                className="inline-flex items-center py-2.5 px-4 text-xs font-medium text-center text-white bg-primary-700 rounded-lg focus:ring-4 focus:ring-primary-200 dark:focus:ring-primary-900 hover:bg-primary-800"
                                onClick={async () => await addComment()}>
                            Post comment
                        </button>
                    </form>
                    {comments?.length > 0 && comments.map(x => {
                        return (
                            <Comment user={user} seedComment={x} key={x.id}/>
                        )
                    })}
                    {!comments && (<LoadingSpinnerLarge/>)}
                </div>
            </section>
        </>)
}