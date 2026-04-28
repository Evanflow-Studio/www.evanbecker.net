---
title: "Why #1196 Isn't AGI"
description: 'The Erdős #1196 story is real, novel, and significant. The popular telling of it as a one-shot AI proof leaves out almost everything that made it work. A close reading.'
date: '2026-04-27'
tags:
  - software
  - ai
  - philosophy
---

On a weekend in late April, I went looking for the actual prompt that had reportedly produced a one-shot proof of an open Erdős conjecture. The story in [Scientific American](https://www.scientificamerican.com/article/amateur-armed-with-chatgpt-vibe-maths-a-60-year-old-problem/), and across the AI commentary internet over the prior week, was that a 23-year-old amateur named Liam Price had typed an open conjecture into ChatGPT and gotten back a proof in a single 80-minute prompt, since verified by Jared Lichtman and Terence Tao. Thomas Bloom, who curates the Erdős Problems site, posted the listing for [#1196](https://www.erdosproblems.com/1196) with a note calling it "perhaps the first Book proof from AI."

If that telling is accurate, it sounds like AGI arrived in April. I went looking because something about the framing didn't sit right, and what I found is that the story is real but the framing is misleading. The gap between those two things is the thing worth understanding.

## I. The Headline

The conjecture at #1196 is about primitive sets. A primitive set is a set of integers in which no element divides any other. The question is whether a particular weighted sum over a primitive set is bounded above by 1 + o(1). Lichtman's 2023 paper had pushed the prior best upper bound to *e^γ π / 4 ≈ 1.399*. The new proof closes the gap to the conjectured constant.

The technical move at the center is a sub-Markov chain on the divisibility poset, weighted by the von Mangoldt function, with a first-entry decomposition that converts the target sum into a hitting probability. The components are old. The von Mangoldt function is from 1899, Mertens' first theorem from 1874, sub-Markov processes are textbook. The combination, applied to this specific problem in this specific way, is new. Bloom calling it "perhaps the first Book proof from AI" is a strong claim from someone who has been careful about not handing out novelty credit cheaply. I take it at face value.

If you stop reading here, you have a story about an AI that did what a research team would do over a year, alone, in the time it takes to watch a movie.

## II. The Prompt

The first thing the wider telling leaves out is what was actually in the prompt.

The dominant practice in the Erdős Problems community for the past several months, documented in a blog post by the contributor who goes by *natso26*, is to wrap the problem in two layers of framing before sending it. The first is "don't search the internet." The second is what natso26 calls, with self-awareness, "gaslighting the model": reframing the open problem as a competition problem. Frontier models have been trained heavily on Olympiad-style reasoning, and reframing an open conjecture as a competition problem stops the hedging and starts the attacking. The community converged on this scaffolding through trial and error. Liam used it.

The prompt also supplied three pieces of "information you may or may not need." Lichtman's 1.399 bound, the lower bound for sets of integers with exactly *k* prime factors, and a related result for primitive sums in a structured family. These are the canonical landmarks of the existing literature on this exact problem. Lichtman's bound is the prior state of the art that any new proof has to beat. The *k*-prime-factor result tells the model the conjectured value is exactly 1, so the model knows what it's reaching for. The user is handing the model a survey of the field, just without naming sources.

What's *not* in the prompt is the actual technical machinery. No mention of the von Mangoldt function, no Markov chains, no divisibility poset. The prompt orients the model toward the right neighborhood of mathematics and tells it the target. It does not tell it how to get there. That distinction matters and I want to be honest about it: the prompt is not doing the proof. The prompt is a refined community-developed instrument that makes the model attempt the proof. *Amateur with no math training types in a question and the AI proves a theorem* implies a naive interface. The actual interface was a deliberately constructed tool, and Liam was using it on purpose.

## III. What's in the Weights

The second thing the wider telling leaves out is what the model already knew.

"Don't search the internet" prevents live retrieval. It does not isolate the model from prior work that already lives in its weights. GPT-5.4 Pro was trained on the public mathematical literature up to its training cutoff. Lichtman's 2023 paper. Lichtman's 2022 thesis on the closely related Erdős primitive set conjecture. Decades of work on primitive sets, the von Mangoldt function, Mertens' theorem, and Markov chains in analytic number theory. All of it.

Pointing this out is not a knock against the result. The right baseline is *the model knows the literature, the same way a working mathematician knows the literature*. A model with no training in the field producing a novel proof would be remarkable; nobody is claiming that. What the training-data point does is correct the framing. The literature being in the weights is the foundation the proof rests on, not a contamination to be defended against.

There's a smaller point here that complicates the *unguided* framing. Liam was not using a Temporary Chat. The conversation has a public chatgpt.com share link, which proves it was a regular saved chat, which means his Pro account's memory and chat history reference were active by default. OpenAI has had cross-conversation history reference enabled by default since April 2025. Liam openly says he runs Erdős problems through this same account regularly, with documented prior attempts on [#851](https://www.erdosproblems.com/851) (20-plus continuations, 15 to 20 hours of cumulative reasoning), on [#333](https://www.erdosproblems.com/333), and others. Whether the model drew on that history during the #1196 run is not something we can verify from outside. The channel is open.

## IV. The Raw Output

The third thing the wider telling leaves out is what came back.

Lichtman, the world expert on this exact problem, said this: *the raw output of ChatGPT's proof was actually quite poor. So it required an expert to kind of sift through and actually understand what it was trying to say.* The proof everyone is now citing is not the proof the model produced. Bloom's note in the formalization repository describes it directly: the original argument was based on a downward divisibility Markov chain, and Tao, Lichtman, Sawin, and Barreto reformulated it in terms of a canonical invariant weight governed by 1/ζ, producing what they call a cleaner hitting-probability proof. The version that was formalized in Lean is the cleaner version.

The model's contribution, more precisely, was a seed. Tao's framing is exact: the AI *inadvertently highlighted a tighter connection between two areas of mathematics than had previously been made explicit in the literature, though there were hints and precursors scattered therein which one can see in retrospect*. He is not claiming the model invented anything. He is claiming the model surfaced a connection the literature had not made explicit, even though precursors existed. That is a real and bounded contribution, and it is what the model did.

The output also was not a finished proof in the technical sense. It contained the load-bearing insight and a structural skeleton sufficient for experts to see what it was reaching for. It also contained gaps. Reformulating the Markov chain argument in terms of an invariant weight, the move that produced the cleaner proof, is mathematical work, not editorial polish. The four mathematicians did mathematics. Calling what they did *verification* underplays it.

Tao later sharpened the framing further. In his updated description, the connection is better understood through flow-network theory than through Markov chains, and on that description he could find no explicit precursor in the literature. Arriving at the right framing took classical mathematics done by Tao. The model's output didn't contain it.

## V. The Loop

If you trace the actual chain from when Liam opened the chat window to when the formalized proof landed on Bloom's site, every link is doing work. Liam selected the problem and applied the prompt scaffold. The model produced a 55-page reasoning trace ending in a structured response containing the seed. Barreto recognized it was unusual and routed it to Lichtman. Lichtman did the initial sift. Lichtman, Tao, Sawin, and Barreto reformulated it. Someone formalized the result in Lean. Bloom posted the listing. Without any of those links, the result does not exist as a publicly verified proof.

This is not a slight on the model. The opposite. A 23-year-old amateur, working from his apartment with a Pro subscription, contributed to an Erdős problem alongside several of the most distinguished mathematicians alive. That used to require a research grant, a graduate program, or a decade of independent work after fifteen years of being a research mathematician. The cost structure of the contribution has changed. It hasn't been erased by being honest about how the loop worked.

The replication question is the cleanest tell. Tao asked, in the [forum thread on #1196](https://www.erdosproblems.com/forum/thread/1196), for the experiment of running multiple cold instances of GPT-5.4 Pro on the same problem with internet disabled, announced in advance, with all attempts including failures reported. Arb Research ran exactly that experiment: ten contamination-controlled runs, eight successful proofs, two plausible. The seed is reproducible. That cuts against the "lucky draw" reading.

What's happened on the forum since the original landing is the more telling part. Tao reframed the connection from Markov chains to flow networks. natso26 sharpened the bound to *1 + γ/log x + O(1/log² x)*. Other contributors produced a divergence-theorem version, a permutation analogue, a function-field version, a zeta-process formulation. None of that came from the model. All of it is classical mathematics done in unexpected directions by working mathematicians, on top of the seed the model produced. The seed reproduces. The work around it does not.

There's more on the structural reason the loop is doing the work, and why bigger models don't change that, in [The Wall](/articles/the-wall), the piece I wrote on what gets left out when you build only with formal-specification tools. Applied here: meaning lives in the conscious interpreter. The model produced text. Lichtman, Tao, Sawin, and Barreto held it and worked out what it was pointing at. The proof is the artifact of that holding.

## VI. Not AGI

This isn't AGI because it doesn't do what we'd expect AGI to do. AGI would mean a system that operates as a thinking agent. Something that confirms its own work, remembers across days, decides what to attend to, recognizes the limits of its own competence. The model that produced the #1196 proof did none of those things. Four humans did them. The proof exists because they did.

Underneath those agency gaps is a deeper one. The model is locked to its training distribution in a way humans are not. The #1196 result happened because the relevant corpus, including Lichtman's papers, the analytic number theory tradition, and decades of work on primitive sets, was deep in the model's weights. Liam's prompt landed inside a well-trained niche. Take the same person, the same prompt scaffold, the same Pro account, and aim it at a specific rendering problem in a new shader language, or a structural engineering question in an unusual building system, or a modeling problem in an emerging field, and the result would be different. The model would flail. Inside its training distribution, it sometimes produces work that looks superhuman. Outside it, the model cannot generate net-new competence, where a curious human still can.

What we used to call science fiction is now a $20-a-month subscription, or $200 a month if you want the Pro tier Liam used. The capability is real. The story about the capability is misleading in specific ways that matter. The wall is still there. None of those three sentences are in tension. All of them have to be held at the same time.

That's what makes this period interesting. Liam plus a community-developed prompt scaffold plus a model with the field's literature in its weights plus four expert mathematicians is an arrangement that didn't exist eighteen months ago, and it produced a proof of a long-standing Erdős conjecture in late April. Take the loop apart in any direction and the proof goes away. I know which part of the loop will get the credit. I want to write down, before that calcifies, that the rest of the loop is what made it.

::link-card{to="https://chatgpt.com/share/69dd1c83-b164-8385-bf2e-8533e9baba9c" label="Read the full ChatGPT conversation" description="Liam's prompt and the 80 minutes of reasoning behind the #1196 proof"}
::
