export interface UserComment {
    id: string,
    author: User,
    published: Date,
    commentText: string,
    targetLocation: string,
    replies: Reply[],
}

export interface Reply {
    id: string,
    author: User,
    published: Date,
    commentText: string,
    targetLocation: string
}

export interface User {
    id: string,
    auth0Id: string,
    avatar: string,
    firstName: string,
    lastName: string,
    isAdmin: boolean,
    isOwner: boolean,
    email: string,
}