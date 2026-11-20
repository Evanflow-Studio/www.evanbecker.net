---
title: 'The Virtual Backlog'
description: 'An image model starts from noise and sharpens toward its prompt, pass by pass. I tried treating a codebase the same way, comparing what we want with what exists as vectors. What the first measurements showed, what failed, and what it does to the architect''s job.'
date: '2026-11-17'
tags:
  - ai
  - software
---

## I. Noise

In the early hours of 17 November 2026, while I was away, a Claude Code session ran a benchmark I'd asked for on my workstation. It spent about four minutes on the CPU, and the first thing it measured said 99.96% of Zeroset's specification was covered by tests.

That couldn't be right, and the session's own notes said so. Zeroset is the main product my studio is building, and its spec is a tree of 3,979 contract rows and 778 invariants, every one of them a sentence about what the software must do. 651 of those contract rows are marked, in the spec itself, as having no test yet. A number that said nearly everything was covered had to be wrong about at least those.

It was wrong in an interesting way. The script compared every statement in the spec with every one of the 8,458 tests in the codebase, as vectors, and called a statement covered when its closest test was close enough. The trouble with "closest of 8,458" is that something is nearly always close. Give a sentence enough strangers to compare itself with and one of them will look like family. The threshold, calibrated the obvious way on statements and the tests known to prove them, had no idea it would be judging a best-of-eight-thousand contest.

The failure fits, because the idea behind the script is mostly about noise.

In 2015, Jascha Sohl-Dickstein and his coauthors published a paper with the unpromising title "Deep Unsupervised Learning using Nonequilibrium Thermodynamics." The idea came from physics. Take an image and add a little noise to it, over and over, until nothing of the image is left. Then train a model to run that process backwards, one small step at a time. Five years later, Jonathan Ho, Ajay Jain and Pieter Abbeel showed in "Denoising Diffusion Probabilistic Models" that the trick produced images that held up against the best generators of the time. Most of the image models people use today descend from that line.

What I keep coming back to is how one of those models looks while it works. It starts from pure static. The first pass is still static, with maybe a vague brightness where the subject will be. A few passes in there's a shape. Somewhere in the middle you can tell it's a dog. By the end there's fur. Each pass made the image a little more like something the prompt would describe, and a little less like noise.

Software could work the same way. The prompt is what we want the product to be. The noise is everything about the product that doesn't match yet, plus everything we can't see well enough to know. Each pass of work, and each pass of measurement, should leave the picture a little less grainy. The script was the first attempt to measure the grain.

## II. Two Trees

The approach needs two things written down, and the first is harder than it sounds.

The first is a source of truth for what we want. In my org that's called desired state: a tree of pages, each holding statements about one product or one part of it, and each statement naming the check that proves it. A behaviour gets a test. A speed gets a measurement in CI against a budget. Zeroset's spec is the most complete of these trees, which is why it was the one I measured.

The second is current state, what's true now. Nobody writes current state down by hand. It's observed: the code, the doc comments, the unit and end-to-end tests, the screenshots those tests take, the CI results, the docs that describe what's built. Writing it down a second time would only give it a way to go stale.

The screenshots are where the analogy stops being an analogy. A statement about how something should look is checked with a screenshot from an end-to-end run, compared with its mockup: a pixel diff first, then a vision model for "close enough." That part of the product is literally an image, approaching a target, one run at a time.

Then you compare the two trees, and the comparison runs in both directions.

A desired statement with nothing close to it in current state is a feature that doesn't exist yet. That's the easy direction, and it's most of what a backlog is supposed to hold.

The other direction is more interesting. Something in current state with nothing close to it in desired state is either explained or it's a problem. It can be explained by the product's architecture: the characteristics it was built to favour, the design patterns it follows, the clean-code and style rules everyone works under, or a decision someone made and wrote down. A retry loop no statement asks for is explained when reliability ranks high and a decision says remote calls retry. If nothing explains it, it's a bug, or at least behaviour nobody expected, and those get ranked.

A bug, once found, turns into a statement of its own. It gets an end-to-end test that fails while the bug exists and passes once it's fixed, and the test runs again on a cadence, so a bug that comes back shows up as a check going red, without anyone having to remember it.

Two more kinds of page sit beside the statements, and the difference between them matters. Ideas are potential features. They link into the knowledge, so an agent working nearby can see them, but they never decide anything. An idea can be wrong, or early, or a whim, and it costs nothing to keep. Goals work the other way round. A goal drives decisions before any feature exists to satisfy it. "www.evanbecker.net runs on DigitalOcean" was a goal the day it was written, and it shaped decisions long before anything had moved.

## III. The Ilities

The "explained" pile needs a source, or every surprise in the codebase turns into a bug report. That source is architecture, and the vocabulary I use for it comes from Mark Richards and Neal Ford.

In *Fundamentals of Software Architecture* they call them architecture characteristics: the qualities a system has to have that aren't features. Performance, scalability, reliability, security, testability, deployability, the long tail of words that end in "ility". Their point is that you can't have all of them. Each one you support costs something in the others, so the job is to pick the few that matter for this system and rank them. An architecture that tries to maximize everything ends up favouring nothing.

The ranking is what makes decisions explainable. If a product ranks reliability above simplicity, the retry loop follows from it, and so does the queue in front of the slow service and the second copy of the database. If it ranks simplicity first, the same code is a smell. The architectural style follows too. A ranking with deployability and fault isolation at the top points one way, and a ranking with simplicity and cost at the top points another.

Ford wrote the second half with Rebecca Parsons and Patrick Kua in *Building Evolutionary Architectures*. They borrowed the fitness function from evolutionary computing, where it scores how close a candidate solution is to the goal, and turned it into an architectural tool: an objective, automated measure of how well the architecture supports one characteristic. A dependency test that fails the build when the interface layer reaches past its services into the database is a fitness function. So is a CI step that fails when a page takes longer than its budget to render.

In the structure I'm describing, the characteristics are ranked per product, the decisions follow from the ranking and from the styles that fit it, and the fitness functions measure the result. Each of those is a page in the tree, with a check. That's what lets the comparison say "explained" with a reason, instead of shrugging.

## IV. What Four Minutes Said

Ideas like this are cheap. I wanted to know how much of it works with what I have, before building anything bigger, so I measured it on Zeroset, locally and for free.

The setup was small on purpose. Zeroset's spec tree, with its 3,979 contract rows, 778 invariants and 8,458 tests, plus my org's own tree of goals and decisions and the infrastructure docs. The model was `BAAI/bge-small-en-v1.5`, an MIT-licensed embedding model that turns a piece of text into 384 numbers, running on the workstation's CPU. For comparison I ran `potion-base-8M`, a much smaller static model, also MIT, and a TF-IDF baseline. A full cold run, embedding everything from scratch, takes about four minutes. Zeroset's specs, tests and stories are all written by the same Claude Code agents, which turns out to matter.

### Finding the proof

The first question was the simplest. Starting from a statement alone, can the vectors find the test that proves it? Many of Zeroset's contract rows name their proving test, so there's a ground truth to score against.

They can, often. Searching from the statement, the model ranks the proving test first 53% of the time, and within the top ten 78% of the time. Chance would manage 0.2%.

A hit looks like this. The statement "a line that crosses nothing, trimmed, MUST be R-SKETCH-TRIM" finds the test `SketchTrimTests: a line that crosses nothing cannot be trimmed` first, out of all 8,458.

A miss looks like this. "#F0a MUST give #ff00aa and #abc #aabbcc" never finds its proof, a test called `rgb doubles each digit`, which ranks 2,190th or worse. The statement and its test share no words, and the meaning lives in notation the model doesn't read: hex shorthand, where each digit doubles.

Then came the result I didn't expect. Plain TF-IDF word matching did as well as the embeddings, 51% first and 78% in the top ten. TF-IDF is older than most of the people who use it. Karen Spärck Jones described its core idea in 1972: a word tells you more about a document the rarer it is across all the others. It has no idea what any word means. It counts.

Averaging the two scores did best of all, 59% first and 84% in the top ten. The likely reason TF-IDF held up is that one set of agents writes the specs, the tests and the stories, in one shared vocabulary. When the person writing the test is also the person who wrote the statement, the words already match, and counting them goes a long way. Embeddings earn their place on the paraphrases, the pairs that mean the same thing in different words. A codebase written by agents turns out to be unusually easy to search by keyword, which I didn't expect.

### The gap

The second question is the one the whole idea rests on. Which desired statements have nothing close in current state?

This is where the 99.96% came from. Recalibrated on the best match each statement actually gets, instead of on known pairs, 678 of the 4,757 statements fall in the gap. The ranking points the right way. Of the 100 lowest-scoring statements, 62% are ones the spec itself declares untested, against 16% across the whole tree.

The gap is easiest to see in one statement. "A turn MUST have at most one Open card" scores 0.731 against its closest evidence, just under the threshold of 0.747. Fifteen of the sixteen statements in its part of the tree are in the gap too, and all fifteen are declared untested. That's a whole feature the spec describes and the code hasn't reached yet. The spec already knew, since all fifteen are marked untested, and the vectors found the same hole from the text alone.

And then the limit. Overlap can't yet tell a feature that's present from one that's absent. Zeroset's current-state docs list things as missing, and the statements nearest those rows land in the gap only 5% of the time, below the 14% base rate. A test that proves a thing is refused reads, to a vector, almost exactly like a test that proves it works. Similarity knows what a sentence is about. It knows nothing about whether it's true.

The other direction had its own lesson. 2,364 items in the code and tests matched nothing in the spec. That sounds like 2,364 bugs. Most of them are helpers: small functions and fields the spec was never meant to describe, sitting below its level of detail. The idea in section II says unexplained items are bugs unless something explains them. In practice, "unexplained" mostly means the spec doesn't zoom in that far, and a list that long needs a second judge before a person reads it.

### Duplicates and contradictions

The same vectors were supposed to find duplicate stories and stories that contradict each other.

The duplicates half works as a ranking. Zeroset's backlog already names nine pairs of its own stories as duplicates, and all nine ranked in the top 1.6% of 455,535 possible pairs. But no threshold cleanly separates duplicates from stories that are merely related, so it can put candidates in front of someone and can't decide on its own.

The contradictions half failed. The filter flagged 31 pairs of statements as possible contradictions, and every one was read by hand. None was real. The filter was keying on words like "never" and "without" in sibling statements written in parallel, which isn't how contradiction works. Two of those pairs did show something worth fixing, real drift between statements that had started out saying the same thing and no longer quite did. The filter flagged them for the wrong reason, and it took reading them to see the right one.

### The passes

The last measurement is the one that looks most like the image model. Start with no evidence at all, then add one kind at a time, and watch coverage climb.

::backlog-figure
::

With no evidence, coverage is 0%. Adding the unit tests takes it to 80.3%. The end-to-end tests add a little, to 80.7%. The doc comments in the code take it to 85.6%, and the current-state docs to 85.7%. Statements that do get covered match evidence in the part of the codebase their domain governs 58 to 60% of the time, against 23 to 26% by chance, so the matches mostly point at the right place.

Some of that climb is by construction. The threshold was set on tests, so the first pass of tests was always going to look good. The honest reading is the shape: unit tests carry most of the picture, doc comments add the most after them, and each later pass sharpens a little less.

### What it can't see yet

Four limits came out of the run, and each one says what the next pass needs.

The smallest model reads a sentence as an average of its words, so "MUST" and "MUST NOT" land almost on top of each other. bge-small does better, because it reads words in order, but it still doesn't read the domain's maths or its notation, which is why the hex-colour statement went unproven.

The threshold was calibrated on the same tree it judges. There's no second tree held back to check it against, and a lot of statements sit just either side of it, so a small move in the threshold moves the gap a lot. Every number in the gap section deserves an "about" in front of it.

The map only knows what it's shown. Some of Zeroset's proofs are shell tests and CI behaviour, and none of that was fed in as evidence, so the parts of the tree those tests prove look emptier than they are. Narrowing each search to the code a statement's domain governs made things worse, too, because the code's layering doesn't match where its tests live.

And nothing in the run executed a test. Evidence here is names and doc comments. A test that exists can fail, or be skipped, and still count as evidence. That's the biggest hole.

The figure is only a picture, too. Squeezing 384 dimensions into two keeps a small share of what the vectors hold, so points that look close on the page may be far apart in the space. It shows the shape of the passes. Nothing on it should be measured with a ruler.

## V. Confidence

Comparing a product with itself is half of it. The other half compares a request with everything we know.

Picture the trees laid over each other: the org's tree of goals and decisions, each product's tree, and the trees of the systems next to them, like the infrastructure. When a request comes in, from me or from an agent, you can place it among them by its vector and ask how well it lands in an area that's well understood. That's its confidence.

I tried six requests and scored each from 0 to 1.

| Request | Confidence |
|---|---|
| "pipeline generates the licensing signing key" | 0.78 |
| "the homelab serves nothing to the internet" | 0.72 |
| "an export limit per web container" | 0.71 |
| "one droplet for every app" | 0.55 |
| "add a newsletter opt-in to the account page" | 0.00 |
| "make video games autonomously with agents" | 0.00 |

The first four landed on rulings and docs that exist. The two zeros are the most useful numbers in the table. That night, neither this website nor the game studio had a desired-state tree, so there was nowhere for those requests to land. The newsletter opt-in was a real request, built the same day, by an agent that had to work out from scratch what this site is. Low confidence says we don't know this area, and whoever takes the work should expect to find things out.

That changes what an agent should do with a request. With a high score it can lean on what's written: the ruling exists, the docs say how, and the work is mostly following them. With a low score, the first job is finding out, by reading the code and asking, and often the first real piece of work is writing the missing part of the tree, so the next request in that area lands somewhere.

The score has its own soft spots. The weights behind it were chosen by hand, because there's no labelled set of requests to fit them to, and a bigger tree raises the best match by chance, simply by offering more to match. It's a ranking of how well we know an area, and I'd read the third decimal place as decoration.

The licensing-key request shows what a written decision does to it. Before I ruled on how that key gets made, the request's best match in the org tree scored 0.630. After the ruling was written down, it scored 0.797. Nobody edited the score, the request, or any list. The ruling went into the tree, the score was recomputed, and the request moved from "we sort of know this" to "we know this."

This is also how agents get to work across many projects at once. Each agent pulls in what's most relevant to its own domain first, from its own product's tree. Things from outside its domain still turn up in its searches, but they rank lower and carry lower confidence. An agent working on the website can see that the infrastructure tree says the homelab serves nothing, and treat it as context from a neighbour, without mistaking it for its own spec.

## VI. The Virtual Backlog

In C++, a virtual function is declared once and resolved at runtime. The code that calls it doesn't know which body will run. That gets decided by the object actually in hand when the call happens, and any subclass can override it. The declaration is stable, and the behaviour is computed in context.

That's the backlog I'm after. Nobody maintains the list of work. It's generated from the gap between the trees, in the context of whoever's asking, and overridden at runtime by whatever's true at that moment. It's a working artifact, closer to RAM than to a file: useful while it's loaded, rebuilt when it's needed, never the thing you protect. In my org's version, the gap is broken into work items by the agents who'll build them, ranked by how fast each one closes the gap, and recalculated when a pull request lands and its checks run. Nobody grooms it.

The licensing key is the small version of the whole idea. The request got easier to act on because a decision was written into a tree, and the backlog's view of it changed without anyone touching the backlog.

Later the same night, the website made the point about itself. An agent wrote the site's desired state as 80 statements, and the bench ran again. "Add a newsletter opt-in to the account page" went from 0.00 to 0.66, and landed on one statement: "Saving the profile never changes the newsletter opt-in." That statement is in the gap at that commit, so the request became a work item without anyone writing a story for it.

The rerun was honest about the site, too. Across its 13 named checks and 45 tests, the right test came first 69% of the time and always within the top five. Coverage came to 52.5%, but tests alone accounted for 18.8%. Adding the endpoints and pages took it to 31.2%, and the README, CLAUDE.md and STATUS.md carried the rest, so half the picture rests on documents, and a document only claims. 47 of 152 things in the current state matched no statement, one of them `/resume`, a live page nobody had thought to write down. And the geometry turned up a stale doc on its own. The README's line "The entire stack is self-hosted on a Proxmox VE homelab" sat nearest the statement that the homelab serves nothing, which says the opposite. The contradiction filter had been noise. This one took a person reading the nearest neighbour.

Once the backlog is computed, the architect stops maintaining it, and the job moves somewhere else.

A big part of an architect's work has always been keeping a list honest. Grooming the backlog, merging the duplicates, noticing the story that contradicts last quarter's decision, explaining why the odd module exists. Every one of those showed up in the measurements: duplicates as a ranking, contradictions as a failed filter, unexplained code as a pile of helpers waiting for a reason. None of them is solved, and none of them is solved by maintaining a better list. Each one gets better when the trees get better. A decision written down raises a request's confidence. A ranked characteristic explains code that would otherwise look like a bug. A statement with a named check becomes evidence instead of a hope.

So the architect's job becomes the trees: keeping the desired state true to what we mean, keeping the characteristics ranked and the decisions written, and keeping the process that does all of that running. The picture gets less grainy because the trees get sharper, pass after pass. It's the same distance between what you can write down and what you mean that I wrote about in [The Wall](/articles/the-wall), and the trees are where I can work on it.

There's a reason I care about getting this right, beyond Zeroset. The longer goal is to make video games with this structure, mostly autonomously. A game is the hardest test I can think of. It has a vision that's barely formal at all, mechanics with rules that can be stated, systems with contracts, and code with tests, and every one of those has to agree with the others. A tree can hold all of that at different levels of zoom. Near the top, a statement can be as grainy as "this should feel like being chased." Near the bottom, it can be as sharp as a contract row. Ideas sit beside it all and never decide anything, and the architectural decisions sit where they belong, at whatever zoom makes sense. The game studio's tree doesn't exist yet, which is why "make video games autonomously with agents" scored zero, and that zero is accurate.

The next passes are clear enough:

- Average the embeddings with TF-IDF by default, since that did best.
- Bring in a language model as a judge, but only for the statements sitting near the threshold, where the vectors can't decide.
- Use CI results as the true current state. A test that passed on main is evidence; a test that merely exists isn't.
- Try a bigger local model, which the homelab I wrote about in [A Homelab That Only Reaches Out](/articles/homelab-reaches-out) is being set up to run.
- Write the game studio's tree, so its requests have somewhere to land, the way the website's now do.

The first number that night said the picture was finished. The honest one, once the threshold allowed for the best-of-eight-thousand problem, was 85.7%, with 678 statements in the gap and a clear list of what the method can't see. I trust that picture more than the clean one. It's grainy, and the grain is in the right places, and every decision I write down from here makes it a little less grainy without anyone touching a list.
