import {Header} from "@/components/Header";
import {Container} from "@/components/Container";
import {Footer} from "@/components/Footer";
import {Button} from "@/components/Button";

const tags: any = {
    Electronics: 'inline-flex items-center rounded-md bg-slate-400/10 px-2 py-1 text-xs font-medium text-slate-200 ring-1 ring-inset ring-slate-400/20',
    Math: 'inline-flex items-center rounded-md bg-red-400/10 px-2 py-1 text-xs font-medium text-red-400 ring-1 ring-inset ring-red-400/20',
    Fiction: 'inline-flex items-center rounded-md bg-yellow-600/10 px-2 py-1 text-xs font-medium text-yellow-500 ring-1 ring-inset ring-yellow-400/20',
    Science: 'inline-flex items-center rounded-md bg-green-600/10 px-2 py-1 text-xs font-medium text-green-400 ring-1 ring-inset ring-green-500/20',
    Business: 'inline-flex items-center rounded-md bg-blue-600/10 px-2 py-1 text-xs font-medium text-blue-400 ring-1 ring-inset ring-blue-400/30',
    Religion: 'inline-flex items-center rounded-md bg-indigo-600/10 px-2 py-1 text-xs font-medium text-indigo-400 ring-1 ring-inset ring-indigo-400/30',
    Software: 'inline-flex items-center rounded-md bg-purple-600/10 px-2 py-1 text-xs font-medium text-purple-400 ring-1 ring-inset ring-purple-400/30',
    Physics: 'inline-flex items-center rounded-md bg-pink-400/10 px-2 py-1 text-xs font-medium text-pink-400 ring-1 ring-inset ring-pink-400/20',
    Engineering: 'inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20',
    History: 'inline-flex items-center rounded-md bg-orange-400/10 px-2 py-1 text-xs font-medium text-orange-400 ring-1 ring-inset ring-orange-400/20',
    Astronomy: 'inline-flex items-center rounded-md bg-teal-600/10 px-2 py-1 text-xs font-medium text-teal-400 ring-1 ring-inset ring-teal-400/20',
    Music: 'inline-flex items-center rounded-md bg-emerald-700/10 px-2 py-1 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-400/20',
};
const resources: any[] = [
    {
        id: 1,
        type: 'Book',
        name: 'Clean Code: A Handbook of Agile Software Craftsmanship',
        author: 'Robert C. Martin',
        href: 'https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882',
        tags: [{id: 1, tag: 'Software'}],
        description: '',
    },
    {
        id: 2,
        type: 'Book',
        name: 'Clean Architecture: A Craftsman\'s Guide to Software Structure and Design',
        author: 'Robert C. Martin',
        href: 'https://www.amazon.com/Clean-Architecture-Craftsmans-Software-Structure/dp/0134494164',
        tags: [{id: 1, tag: 'Software'}],
        description: '',
    },
    {
        id: 3,
        type: 'Book',
        name: 'Clean Agile: Back to Basics',
        author: 'Robert C. Martin',
        href: 'https://www.amazon.com/Clean-Agile-Basics-Robert-Martin/dp/0135781868',
        tags: [{id: 1, tag: 'Software'}],
        description: '',
    },
    {
        id: 4,
        type: 'Book',
        name: 'The Nature of Code',
        author: 'Daniel Shiffman',
        href: 'https://natureofcode.com/',
        tags: [{id: 1, tag: 'Software'}, {id: 2, tag: 'Math'}],
        description: 'The creator of The Coding Train on YouTube wrote this book. Highly recommend.',
    },
    {
        id: 5,
        type: 'Book',
        name: 'CLR via C# (Developer Reference) - 4th Edition',
        author: 'Jeffrey Richter',
        href: 'https://www.amazon.com/CLR-via-4th-Developer-Reference/dp/0735667454',
        tags: [{id: 1, tag: 'Software'}],
        description: '',
    },
    {
        id: 6,
        type: 'Book',
        name: 'Head First Design Patterns: Building Extensible and Maintainable Object-Oriented Software - 2nd Edition',
        author: 'Eric Freeman & Elisabeth Robson',
        href: 'https://www.amazon.com/Head-First-Design-Patterns-Object-Oriented/dp/149207800X',
        tags: [{id: 1, tag: 'Software'}],
        description: '',
    },
    {
        id: 7,
        type: 'Book',
        name: 'Fundamentals of Software Architecture',
        author: 'Mark Richards & Neal Ford',
        href: 'https://www.amazon.com/Fundamentals-Software-Architecture-Comprehensive-Characteristics/dp/1492043451',
        tags: [{id: 1, tag: 'Software'}],
        description: '',
    },
    {
        id: 8,
        type: 'Book',
        name: 'Game Programming Patterns',
        author: 'Robert Nystrom',
        href: 'https://www.amazon.com/dp/0990582906',
        tags: [{id: 1, tag: 'Software'}],
        description: '',
    },
    {
        id: 9,
        type: 'Book',
        name: 'Kubernetes Patterns: Reusable Elements for Designing Cloud-Native Applications',
        author: 'Bilgin Ibryam & Roland Huß',
        href: 'https://www.amazon.com/Kubernetes-Patterns-Designing-Cloud-Native-Applications/dp/149205028',
        tags: [{id: 1, tag: 'Software'}],
        description: '',
    },

    {
        id: 10,
        type: 'Book',
        name: 'Mastering Docker Enterprise: A Companion guide for agile container adoption',
        author: 'Mark Panthofer',
        href: 'https://www.amazon.com/Mastering-Docker-Enterprise-companion-container/dp/1789612071',
        tags: [{id: 1, tag: 'Software'}],
        description: 'Written by a fellow nvisia-ite. Does a good job explaining core, basic Docker practices.',
    },
    {
        id: 11,
        type: 'Book',
        name: 'The Colossal Book of Short Puzzles and Problems',
        author: 'Martin Gardner',
        href: 'https://www.amazon.com/Colossal-Book-Short-Puzzles-Problems/dp/0393061140',
        tags: [{id: 1, tag: 'Software'}],
        description: 'A good way to find fun coding problems! 😉',
    },
    {
        id: 12,
        type: 'Book',
        name: 'Bayes Theorem: A Visual Introduction For Beginners',
        author: 'Dan Morris',
        href: 'https://www.amazon.com/Bayes-Theorem-Examples-Introduction-Beginners-ebook/dp/B01LZ1T9IX',
        tags: [{id: 1, tag: 'Software'}, {id: 2, tag: 'Math'}],
        description: '',
    },
    {
        id: 13,
        type: 'Book',
        name: 'Neural Networks Math: A Visual Introduction For Beginners',
        author: 'Michael Taylor',
        href: 'https://www.amazon.com/Bayes-Theorem-Examples-Introduction-Beginners-ebook/dp/B01LZ1T9IX',
        tags: [{id: 1, tag: 'Software'}, {id: 2, tag: 'Math'}],
        description: '',
    },
    {
        id: 14,
        type: 'Book',
        name: 'Data Science',
        author: 'John D. Kelleher & Brendan Tierney',
        href: 'https://mitpress.mit.edu/books/data-science',
        tags: [{id: 1, tag: 'Software'}, {id: 2, tag: 'Math'}],
        description: '',
    },
    {
        id: 15,
        type: 'Book',
        name: 'Game Development Essentials: An Introduction',
        author: 'Jeannie Novak',
        href: 'https://www.amazon.com/Game-Development-Essentials-Jeannie-Novak/dp/1111307652',
        tags: [{id: 1, tag: 'Software'}],
        description: '',
    },
    {
        id: 16,
        type: 'Book',
        name: 'Event Streams in Action: Real-time event systems with Kafka and Kinesis',
        author: 'Alexander Dean & Valentin Crettaz',
        href: 'https://www.amazon.com/Event-Streams-Action-Unified-processing/dp/1617292346',
        tags: [{id: 1, tag: 'Software'}],
        description: '',
    },
    {
        id: 17,
        type: 'Book',
        name: 'Modern Chess Openings - 15th Edition',
        author: 'Nick De Firmian',
        href: 'https://www.amazon.com/Event-Streams-Action-Unified-processing/dp/1617292346',
        tags: [{id: 1, tag: 'Math'}],
        description: '',
    },
    {
        id: 18,
        type: 'Book',
        name: 'The Checklist Manifesto: How to Get Things Right',
        author: 'Atul Gawande',
        href: 'https://www.amazon.com/Checklist-Manifesto-How-Things-Right/dp/0312430000',
        tags: [{id: 1, tag: 'Business'}],
        description: '',
    },
    {
        id: 19,
        type: 'Book',
        name: 'Cracking the Coding Interview: 189 Programming Questions and Solutions',
        author: 'Gayle Laakmann McDowell',
        href: 'https://www.amazon.com/Cracking-Coding-Interview-Programming-Questions/dp/0984782850',
        tags: [{id: 1, tag: 'Business'}],
        description: '',
    },
    {
        id: 20,
        type: 'Book',
        name: 'Pagan Monotheism in Late Antiquity',
        author: 'Polymnia Athanassiadi & Michael Frede',
        href: 'https://www.amazon.com/Pagan-Monotheism-Antiquity-Polymnia-Athanassiadi/dp/019924801X',
        tags: [{id: 1, tag: 'Religion'}, {id: 2, tag: 'History'}],
        description: '',
    },
    {
        id: 21,
        type: 'Book',
        name: 'The Ark Before Noah: Decoding the Story of the Flood',
        author: 'Yitzchak Irving Finkel',
        href: 'https://www.amazon.com/Ark-Before-Noah-Decoding-Story/dp/0385537115',
        tags: [{id: 1, tag: 'Religion'}, {id: 2, tag: 'History'}],
        description: '',
    },
    {
        id: 22,
        type: 'Book',
        name: 'A History of God: The 4,000-Year Quest of Judaism, Christianity and Islam',
        author: 'Karen Armstrong',
        href: 'https://www.amazon.com/History-God-000-Year-Judaism-Christianity/dp/0345384563',
        tags: [{id: 1, tag: 'Religion'}, {id: 2, tag: 'History'}],
        description: '',
    },
    {
        id: 23,
        type: 'Book',
        name: 'White Fragility: Why It\'s So Hard for White People to Talk About Racism"',
        author: 'Robin Diangelo',
        href: 'https://www.amazon.com/White-Fragility-People-About-Racism/dp/0807047414',
        tags: [{id: 1, tag: 'History'}],
        description: '',
    },
    {
        id: 24,
        type: 'Book',
        name: 'On Anarchism',
        author: 'Noam Chomsky',
        href: 'https://www.amazon.com/Anarchism-Noam-Chomsky/dp/1595589104',
        tags: [{id: 1, tag: 'History'}],
        description: '',
    },
    {
        id: 25,
        type: 'Book',
        name: 'The Hitchhiker\'s Guide to the Galaxy',
        author: 'Douglas Adams',
        href: 'https://www.amazon.com/Hitchhikers-Guide-Galaxy-Book-Set/dp/B015W3TV5O',
        tags: [{id: 1, tag: 'Fiction'}],
        description: '',
    },
    {
        id: 26,
        type: 'Book',
        name: 'Last Chance to See',
        author: 'Douglas Adams',
        href: 'https://www.amazon.com/Hitchhikers-Guide-Galaxy-Book-Set/dp/B015W3TV5O',
        tags: [{id: 1, tag: 'Fiction'}],
        description: '',
    },
    {
        id: 27,
        type: 'Book',
        name: 'Dirk Gently\'s Holistic Detective Agency',
        author: 'Douglas Adams',
        href: 'https://www.amazon.com/Last-Chance-See-Douglas-Adams/dp/0345371984',
        tags: [{id: 1, tag: 'Fiction'}],
        description: '',
    },
    {
        id: 28,
        type: 'YouTube',
        name: 'Nick Chapsas',
        author: 'Nick Chapsas',
        href: 'https://www.YouTube.com/c/Elfocrash',
        tags: [{id: 1, tag: 'Software'}],
        description: '',
    },
    {
        id: 29,
        type: 'YouTube',
        name: 'The Coding Train',
        author: 'The Coding Train',
        href: 'https://www.youtube.com/c/TheCodingTrain',
        tags: [{id: 1, tag: 'Software'}, {id: 2, tag: 'Math'}, {id: 3, tag: 'Science'}],
        description: '',
    },
    {
        id: 30,
        type: 'YouTube',
        name: 'Code Bullet',
        author: 'Code Bullet',
        href: 'https://www.youtube.com/c/CodeBullet',
        tags: [{id: 1, tag: 'Software'}, {id: 2, tag: 'Math'}, {id: 3, tag: 'Science'}],
        description: '',
    },
    {
        id: 31,
        type: 'YouTube',
        name: 'danooct1',
        author: 'danooct1',
        href: 'https://www.youtube.com/c/danooct1',
        tags: [{id: 1, tag: 'Software'}, {id: 2, tag: 'Math'}, {id: 3, tag: 'History'}],
        description: '',
    },
    {
        id: 32,
        type: 'YouTube',
        name: 'sentdex',
        author: 'sentdex',
        href: 'https://www.youtube.com/c/sentdex',
        tags: [{id: 1, tag: 'Software'}, {id: 2, tag: 'Math'}],
        description: '',
    },
    {
        id: 33,
        type: 'YouTube',
        name: 'Jabrils',
        author: 'Jabrils',
        href: 'https://www.youtube.com/c/Jabrils',
        tags: [{id: 1, tag: 'Software'}],
        description: '',
    },
    {
        id: 34,
        type: 'YouTube',
        name: 'Code Parade',
        author: 'Code Parade',
        href: 'https://www.youtube.com/c/CodeParade',
        tags: [{id: 1, tag: 'Software'}, {id: 2, tag: 'Math'}],
        description: '',
    },
    {
        id: 35,
        type: 'YouTube',
        name: 'hhp3',
        author: 'hhp3',
        href: 'https://www.youtube.com/user/hhp3',
        tags: [{id: 1, tag: 'Software'}, {id: 2, tag: 'Science'}, {id: 3, tag: 'Math'}],
        description: '',
    },
    {
        id: 36,
        type: 'YouTube',
        name: 'Ben Eater',
        author: 'Ben Eater',
        href: 'https://www.youtube.com/c/BenEater',
        tags: [{id: 1, tag: 'Electronics'}, {id: 2, tag: 'Engineering'}],
        description: '',
    },
    {
        id: 37,
        type: 'YouTube',
        name: 'scanlime',
        author: 'scanlime',
        href: 'https://www.youtube.com/c/scanlime',
        tags: [{id: 1, tag: 'Software'}, {id: 2, tag: 'Electronics'}, {id: 3, tag: 'Engineering'}],
        description: '',
    },
    {
        id: 38,
        type: 'YouTube',
        name: 'Zack Freedman',
        author: 'Zack Freedman',
        href: 'https://www.youtube.com/c/ZackFreedman',
        tags: [{id: 1, tag: 'Electronics'}, {id: 2, tag: 'Engineering'}],
        description: '',
    },
    {
        id: 39,
        type: 'YouTube',
        name: 'The 8-Bit Guy',
        author: 'The 8-Bit Guy',
        href: 'https://www.youtube.com/c/The8BitGuy',
        tags: [{id: 1, tag: 'Electronics'}, {id: 2, tag: 'Engineering'}, {id: 3, tag: 'History'}],
        description: '',
    },
    {
        id: 40,
        type: 'YouTube',
        name: 'Sam Zeloof',
        author: 'Sam Zeloof',
        href: 'https://www.youtube.com/c/SamZeloof',
        tags: [{id: 1, tag: 'Electronics'}, {id: 2, tag: 'Engineering'}, {id: 3, tag: 'History'}, {id: 4, tag: 'Science'}],
        description: '',
    },
    {
        id: 41,
        type: 'YouTube',
        name: '3Blue1Brown',
        author: '3Blue1Brown',
        href: 'https://www.youtube.com/c/3blue1brown',
        tags: [{id: 1, tag: 'Math'}, {id: 1, tag: 'Physics'}],
        description: '',
    },
    {
        id: 42,
        type: 'YouTube',
        name: 'Numberphile',
        author: 'Numberphile',
        href: 'https://www.youtube.com/c/numberphile',
        tags: [{id: 1, tag: 'Math'}],
        description: '',
    },
    {
        id: 43,
        type: 'YouTube',
        name: 'patrickJMT',
        author: 'patrickJMT',
        href: 'https://www.youtube.com/c/patrickjmt',
        tags: [{id: 1, tag: 'Math'}],
        description: '',
    },
    {
        id: 44,
        type: 'YouTube',
        name: 'PBS Space Time',
        author: 'PBS Space Time',
        href: 'https://www.youtube.com/c/pbsspacetime',
        tags: [{id: 1, tag: 'Math'}, {id: 2, tag: 'Science'}, {id: 3, tag: 'Astronomy'}, {id: 4, tag: 'Physics'}],
        description: '',
    },
    {
        id: 45,
        type: 'YouTube',
        name: 'PBS Eons',
        author: 'PBS Eons',
        href: 'https://www.youtube.com/c/eons',
        tags: [{id: 1, tag: 'Science'}],
        description: '',
    },
    {
        id: 46,
        type: 'YouTube',
        name: 'SmarterEveryDay',
        author: 'SmarterEveryDay',
        href: 'https://www.youtube.com/c/smartereveryday',
        tags: [{id: 1, tag: 'Science'}, {id: 2, tag: 'Engineering'}, {id: 3, tag: 'Math'}, {id: 4, tag: 'Physics'}],
        description: '',
    },
    {
        id: 47,
        type: 'YouTube',
        name: 'Anton Petrov',
        author: 'Anton Petrov',
        href: 'https://www.youtube.com/c/pbsspacetime',
        tags: [{id: 1, tag: 'Math'}, {id: 2, tag: 'Science'}, {id: 3, tag: 'Astronomy'}, {id: 4, tag: 'Physics'}],
        description: '',
    },
    {
        id: 48,
        type: 'YouTube',
        name: 'styropyro',
        author: 'styropyro',
        href: 'https://www.youtube.com/c/styropyro',
        tags: [{id: 1, tag: 'Engineering'}, {id: 2, tag: 'Science'},  {id: 3, tag: 'Physics'}],
        description: '',
    },
    {
        id: 49,
        type: 'YouTube',
        name: 'Veritasium',
        author: 'Veritasium',
        href: 'https://www.youtube.com/c/veritasium',
        tags: [{id: 1, tag: 'Science'}, {id: 2, tag: 'Physics'}, {id: 3, tag: 'Engineering'}],
        description: '',
    },
    {
        id: 50,
        type: 'YouTube',
        name: 'Rob Scallon',
        author: 'Rob Scallon',
        href: 'https://www.youtube.com/c/robscallon',
        tags: [{id: 1, tag: 'Science'}, {id: 2, tag: 'History'}, {id: 3, tag: 'Engineering'}, {id: 4, tag: 'Music'}],
        description: '',
    },
    {
        id: 51,
        type: 'YouTube',
        name: 'The Science Asylum',
        author: 'The Science Asylum',
        href: 'https://www.youtube.com/c/Scienceasylum',
        tags: [{id: 1, tag: 'Science'}, {id: 2, tag: 'Physics'}, {id: 3, tag: 'Math'}],
        description: '',
    },
    {
        id: 52,
        type: 'YouTube',
        name: 'Tom Scott',
        author: 'Tom Scott',
        href: 'https://www.youtube.com/c/TomScottGo',
        tags: [{id: 1, tag: 'Science'}, {id: 2, tag: 'Physics'}, {id: 3, tag: 'Math'}, {id: 4, tag: 'Engineering'}, {id: 5, tag: 'Software'}],
        description: '',
    },
    {
        id: 53,
        type: 'YouTube',
        name: 'ReligionForBreakfast',
        author: 'ReligionForBreakfast',
        href: 'https://www.youtube.com/c/ReligionForBreakfast',
        tags: [{id: 1, tag: 'Religion'}, {id: 2, tag: 'History'}],
        description: '',
    },
    {
        id: 54,
        type: 'YouTube',
        name: 'GothamChess',
        author: 'GothamChess',
        href: 'https://www.youtube.com/c/GothamChess',
        tags: [{id: 1, tag: 'Math'}],
        description: '',
    },
    {
        id: 55,
        type: 'YouTube',
        name: 'Captain Disillusion',
        author: 'Captain Disillusion',
        href: 'https://www.youtube.com/c/CaptainDisillusion',
        tags: [{id: 1, tag: 'Engineering'}, {id: 2, tag: 'Fiction'}],
        description: '',
    },
]

function classNames(...classes: any[]) {
    return classes.filter(Boolean).join(' ')
}

export default function Resources() {
    return (
        <>
            <Header/>

            <Container className="mt-8 sm:mt-16 w-full">
                <h1 className="text-4xl font-bold tracking-tight text-light sm:text-5xl text-slate-200">
                    Resources
                </h1>
                <div className="mt-6 space-y-7 text-base text-slate-300">
                    <p>
                        A tagged list of (randomly assorted) resources that I&apos;ve found
                        useful, fun, or interesting.
                        Have fun and look around 👀!
                    </p>
                </div>
                <div className="">
                    <ul role="list" className="divide-y divide-slate-700">
                        {resources.map((resource) => (
                            <li key={resource.id} className="flex items-center justify-between gap-x-6 py-5">
                                <div className="min-w-0">
                                    <div className="flex items-start gap-x-3">
                                        <p className="text-lg font-semibold leading-6 text-slate-200">{resource.name}</p>

                                        {resource.tags.map((tag) => {
                                            return (
                                                <div key={tag.id}>
                                                    <p
                                                        className={classNames(
                                                            tags[tag.tag],
                                                            'rounded-md whitespace-nowrap mt-0.5 px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset text-slate-300'
                                                        )}
                                                    >
                                                        {tag.tag}
                                                    </p>
                                                </div>
                                            );
                                        })}




                                    </div>
                                    <div className="mt-1 flex items-center gap-x-2 text-xs leading-5 text-slate-400">
                                        <p className="whitespace-nowrap">
                                            {resource.type}
                                        </p>
                                        <svg viewBox="0 0 2 2" className="h-0.5 w-0.5 fill-current">
                                            <circle cx={1} cy={1} r={1} />
                                        </svg>
                                        <p className="truncate">By {resource.author}</p>
                                    </div>
                                    <div className="mt-1 flex items-center gap-x-2 text-sm leading-5 text-slate-400">
                                        {resource.description}
                                    </div>
                                </div>
                                <div className="flex flex-none items-center gap-x-4">
                                    <Button type="link" href={resource.href} variant="outline" color="white" className="w-full mt-6"
                                    >
                                        Check it out!<span className="sr-only">, {resource.name}</span>
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

            </Container>
            <Footer/>
        </>
    )
}
