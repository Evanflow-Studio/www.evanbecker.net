---
title: 'The Wall'
description: 'AI engineering keeps running into a boundary that science itself was built to ignore. Where the wall came from, who has hit it before, and what working honestly on the wrong side of it looks like.'
date: '2026-04-27'
tags:
  - software
  - ai
  - philosophy
---

*In 1623, Galileo decided science would study only the measurable side of reality. Every discipline that tries to describe meaning has been running into what that decision left out. AI engineering is the latest to hit it, and the first to be selling solutions on the wrong side of the line.*

## I. The Wall

As a junior at the University of Wisconsin–Milwaukee, I was a co-researcher on a grant-funded project with Jacques du Plessis, an associate professor in UWM's School of Information Studies. The project was called EarGear. It wasn't a linguistics project, exactly. It was an accessibility project. Take a language-learning application, with its flashcards and lessons and exercises, the kind of UI a sighted student moves through on a phone or laptop. Figure out how a blind student could navigate that same application using only audio and physical input.

The language part translated cleanly. Audio handles vocabulary natively. Pronunciation is its native domain. Flashcards can be spoken; quizzes can be answered with keyboard input. None of that was the hard part.

The hard part was UX. The things sighted users get from a screen refuse to translate to audio without something getting lost. Where am I in the menu? What's above me and below me? What's the spatial relationship between the lesson I just finished and the one I'm about to start? Sighted users answer those questions instantly with a glance. We tried longer descriptions. We built richer cues. We mapped keyboard shortcuts to navigation actions. We did everything we could to encode the spatial awareness a sighted user gets for free, and the gap stayed. Something a screen does, audio doesn't quite manage to do, no matter how clever the encoding.

I didn't have words for it back then. I spent months working around the edges of something I could tell was there but couldn't name.

Ten years later, three hours into debugging an AI agent's tool-calling loop, I was in the same place.

The agent was working. It autonomously scheduled follow-up actions, reasoned through situations I hadn't anticipated, produced outputs I hadn't predicted. It was also sending malformed API requests that cascaded into four downstream errors. The creativity and the danger were the same capacity. I could fix the specific errors. I couldn't fix the thing underneath them.

The thing underneath was judgment. I wanted the agent to have the kind of situational awareness a senior engineer has. The glance at a pull request that says "this is wrong" before the first function body has loaded. Not a decision tree. Not a scoring rubric. A feel. And I was trying to pour that feel into a text string the length of a long paragraph.

::wall-viz{formal-label="What I write" qualitative-label="What I mean"}
#formal
`"""You are a helpful assistant with good judgment."""`

#qualitative
Be the kind of agent I would trust to act on my behalf, in situations I haven't imagined yet, with values I can point at but not specify.
::

The space between those two sides is the wall. It lives in the tools we've inherited, not in reality. The boundary between what you can write down in symbols and what those symbols are trying to point at. Formal specification lives on one side. Judgment, experience, meaning, and consciousness were declared, four centuries ago, to live on the other. They didn't go anywhere. They're still here, in every conscious moment you're having, including this one. They're just not what our tools were made to reach. Chain-of-thought, few-shot, fine-tuning, careful prompt design: all of it narrows the gap. None of it closes it.

It was the same wall I'd been hitting back then. What I'd been calling a UX problem had an older name: the hard problem of consciousness. The people who have thought hardest about it are not engineers. The people who have thought hardest about it built the wall, four centuries ago, by deciding what science would and wouldn't be allowed to study.

## II. The Line

In 1623, Galileo Galilei published *The Assayer* and laid down a rule for what science was going to be about. Size, shape, position, motion. He called these *primary qualities*. Real, measurable, properties of the world itself. Colors, tastes, smells, warmth, the felt texture of a body in pain. These were *secondary qualities*. Subjective, located in the observer, not in the world. Science, Galileo argued, would have nothing to do with them.

That decision turned out to be one of the most productive in the history of Western thought. Four centuries of physics, chemistry, and biology are built on it. The philosopher Philip Goff of Durham University, in his book *Galileo's Error*, argues it is also the source of the hard problem of consciousness. Goff's framing of the move is direct. Galileo took the mind out of matter; the science of matter flourished, and the science of mind didn't, and now four centuries later we're trying to put the mind back in and wondering why it doesn't fit.

Goff's point is more precise than it first sounds. Galileo's move was a methodological choice. By defining science as the study of the measurable, he placed consciousness, which is irreducibly qualitative, outside the frame of what science would investigate. Consciousness remained exactly what it had been; only the frame changed. The hard problem followed by construction.

The wall is what that line became once enough time had passed. It is the trace of a methodological decision that got made and then stopped being remembered as a decision. When Galileo drew his line down the middle of what could be studied, he didn't bar the other half from existence. He defined it as outside what science was going to be about. Every formal system we've built since lives on the side of the line he chose. Every model, every spec, every programming language, every logical calculus. The laboratory was built to see only one half of the world. The other half was always there. It just wasn't what the instruments were tuned for.

## III. Three Ways to Know the Wall Is Real

Philosophy has been testing the wall for about seventy-five years. It started in 1950 with Alan Turing, who noticed the question "can machines think?" was unanswerable as stated and replaced it with a game. Could a machine's conversation be made indistinguishable from a human's? Turing's move was to swap inner experience for observable behavior. The question he set aside, whether anything is happening on the inside, has only gotten sharper as the systems have gotten more capable. Three sharper probes have been developed since. Each rules out a different resource you might think could cross the wall.

### Mary's Room

::qualia-demo{color="#c0392b"}
`#c0392b`. Hue 5°, saturation 67%, lightness 47%, wavelength ~700nm. Each of those facts is correct. None of them is the thing you are seeing right now.
::

Frank Jackson, an Australian philosopher whose "knowledge argument" is one of the most-debated thought experiments in the field, gave us Mary. Mary is a scientist who has spent her entire life in a black-and-white room. She's never seen color. She's also been given every physical fact about color vision. Every wavelength, every photoreceptor response, every neural pathway. She could teach the subject at any university in the world. Then one day she walks outside and sees a red rose.

Does she learn something she didn't know before?

Most people, reading this for the first time, say yes. And the implication of the yes is severe. Complete physical information, every fact you could possibly write down, doesn't close the gap. Mary had *all* the data. The experience was still on the other side. (Jackson later recanted his own argument. Daniel Dennett, the Tufts cognitive scientist who died in 2024, spent decades arguing that truly complete information would include the capacity to predict the experience. The debate is about where the wall sits. Both sides agree it's there.)

Every system prompt I've ever written is Mary's textbook. Complete, correct, and somehow always missing the thing I meant to say.

### The Chinese Room

John Searle proposed the second probe in 1980. Imagine a person locked in a room. Chinese characters come in through a slot. The person has an English rulebook explaining which characters to pass back out in response to which characters arrived. The room appears, from outside, to understand Chinese perfectly. The person inside understands nothing.

Searle's claim is that syntax isn't semantics. Following a language's rules isn't the same as meaning anything by them. The room passes every observable test for comprehension while containing none inside. The parallel to LLM inference is hard to miss. The model applies statistical rules to which tokens follow which other tokens, and the output is often indistinguishable from understanding. Whether understanding is happening inside the system, or only in the human reading the output, is exactly Searle's question. (There are serious responses. The "systems reply" argues that understanding might belong to the room-as-a-whole rather than to the person inside. Even that concedes that understanding, if it's present, is somewhere other than where you'd intuitively look for it.)

A modern agent is a Chinese Room at scale. Tokens in, statistical rules applied, tokens out. The question is whether anything built on this substrate can cross the wall, or whether we're just making fancier rooms.

### The Blind Geometer

Take a triangle. Three sides, three angles, Pythagoras. The propositional content, meaning the facts about what a triangle *is*, travels through any medium a listener can receive. You can describe a triangle in prose, in speech, in equations, in a proof. All the facts survive translation.

What doesn't travel is the pointing. The word "triangle" was built to refer to an experience. A shape on a page, the pointed-ness a sighted reader recognizes before they've named it. That recognition depends on a substrate the listener has to already share. Someone blind since birth holds "triangle" differently than someone sighted. The word is a pointer. The pointer is a separate thing from what it points at.

This is the EarGear problem. The propositional content of the language traveled through audio with minimal loss. The parts that depended on a sighted substrate refused, and more audio could not make them. The spatial awareness. The visual hierarchy. The where-am-I sense a screen gives you for free. What we were hitting was this probe, run as a research project on a deadline.

| Probe | What it tests | What it shows |
| --- | --- | --- |
| Mary's Room | Can complete physical information cross the wall? | No. All descriptions D ⊬ quale. More information doesn't help. |
| Chinese Room | Can syntactic computation cross the wall? | No. All rules R ⊬ semantics. More computation doesn't help. |
| Blind Geometer | Can propositional knowledge cross the wall? | No. All propositions P ⊬ experience. More knowledge doesn't help. |

Three probes. Three kinds of resource that should've been enough to close the wall. Information. Computation. Propositional knowledge. Three verdicts saying none of them are. The wall is the shape of Galileo's decision, showing up wherever that decision constrains what we're allowed to count as real. Knowing more, computing more, or saying more doesn't change the shape.

## IV. On the Other Side

If the wall is our tools' blindspot, the question becomes what they've been making us unable to see. The most serious answer is consciousness. What consciousness actually is, whether a trick the brain plays on itself, or a fundamental feature of reality, or something in between, determines what the wall has been. If consciousness is fundamental, the wall was never real. Our tools have just been designed not to see what was there all along. If consciousness is only a brain's self-model, then there's nothing beyond the wall and we've been chasing a shadow. Either way the engineering implications are direct.

Start with how simple it can get. Thomas Metzinger, a German philosopher at Mainz who's spent decades studying the structure of subjective experience, runs a research project called Minimal Phenomenal Experience. The goal is to strip consciousness to its floor. No memory. No selfhood. No time. Over a thousand advanced meditators across fifty-seven countries report what's left with eerie consistency. Silent, crystal-clear wakefulness. Just awareness, aware of being awake. Non-meditators touch this briefly too, in the disorientation of waking from a deep nap, when for a moment you don't know who or where you are, but there's no doubt that you are. Whatever's on the other side of the wall can be extraordinarily simple. Which means whatever produces it has to be simpler and more fundamental than the full furniture of a mental life.

Then there's the attempt to measure it. Integrated Information Theory, developed by the neuroscientist Giulio Tononi at the University of Wisconsin–Madison, is the most ambitious formalism currently going for what's on the other side. Its claim is sharp. Consciousness *is* integrated information. It's the degree to which a system is causally woven together such that breaking it into parts loses something essential. IIT rests on a tradition of work with split-brain patients. In the most famous experiment, the neuropsychologist Michael Gazzaniga and his collaborator Joseph LeDoux showed a chicken's head to a patient's left hemisphere and a snow shovel to the right. The right hand (left brain) picked a chicken. The left hand (right brain) picked a shovel. Then they asked the patient *why* they'd picked the shovel. The left hemisphere had never seen the shovel. It didn't say "I don't know." It never says "I don't know." It said, "Oh, you need a shovel to clean out the chicken shed." Gazzaniga called this the *left-brain interpreter*. Its job is to narrate, and it'll invent a narration before it'll admit an absence. The deeper observation is structural. Sever the corpus callosum and one unified experience becomes two. Unity tracks the wiring. The mathematics of consciousness, if there is any, seems to follow physical integration. That's what gave IIT its traction.

IIT is contested, and rightly so. Serious objections exist. By the theory's math, a large inactive grid of logic gates would be more conscious than a human, which is uncomfortable. The core quantity is computationally intractable for any real system. And there's room to ask whether integrated information *is* consciousness, or whether it just correlates with it. As a lens, though, it's the sharpest one available, and it points somewhere specific.

Both dualism and materialism are responses to Galileo's wall. Dualism says consciousness lives on the other side, in a separate non-physical substance, and has no way to explain how that substance interacts with the physical. Materialism says there's nothing on the other side, that the qualitative is just what the quantitative stuff *does*, and has no way to derive the qualitative from a framework explicitly designed to exclude it. Four centuries in, the hard problem has resisted every materialist solution. Materialists are smart, but they're trying to reach the qualitative with tools whose design deletes it.

Panpsychism offers a third route. It says the wall is an illusion. There was never a real separation between the quantitative and the qualitative. Matter has always had an experiential dimension, however thin. What we call consciousness in complex organisms is the most organized expression of something that was already there. Not an electron with opinions. An electron with *something*, a proto-experiential property, and consciousness as something that tracks causal integration along a spectrum. The biggest open question is the combination problem. If every particle has some faint proto-experiential quality, how do those micro-experiences compose into the unified experience of being you, right now, reading this sentence? IIT has the beginnings of an answer. It's far from settled.

I'm claiming the arguments against materialism are strong enough to take seriously, and that of the coherent alternatives available, panpsychism is the one I can actually hold. Whether it's proven is a different question I'm not trying to answer. And if the wall is what I've been saying it is, we should expect to find it wherever a field tries to encode the qualitative in a formal medium.

## V. Everywhere You Look

We do.

Stephen Hawking, in *A Brief History of Time*, asks the question that haunts the wall from physics: "What is it that breathes fire into the equations and makes a universe for them to describe?" The equations work. The predictions land. They don't tell you why the formalism has any referent at all. Why there's something rather than nothing for the math to be about. From physics, this is Hawking's question. From engineering, it's mine.

Alex O'Connor has a go-to example. It goes something like this. Imagine aliens find a book. They have all the time in the world to study it. They work out the rules of the language. They learn its grammar, its syntax. They notice the way certain lines fall into iambic pentameter, the way some lines rhyme. They publish papers. They are clearly making progress. Someone asks why the book was written. The answer comes back: well, we don't have that one yet, but look at how much we've figured out about how the book *works*. They have, in fact, never gotten any closer to the question of why the book exists at all. They have only mapped its rules with increasing precision. Description has been mistaken for explanation, and the mistake doesn't get caught because the description keeps getting better. O'Connor calls it a category error. It's the same category error physics keeps making, and neuroscience, and engineering, every time we confuse a sharper map of how a thing behaves with an answer to why the thing is there.

The zoologist and historian Matthew Cobb, writing in *The Idea of the Brain*, names the trap every generation falls into in this territory. Hydraulics for Descartes. Telegraphs in the nineteenth century. Computers in the twentieth. Neural networks now. Each generation understands the brain through its most advanced technology, and each generation's understanding turns out to be productive and wrong. I'm doing my own version of the same move. I'm reading philosophical questions several centuries older than me through the lens of autonomous agents, because autonomous agents are the machine I'm holding. Someone reading this in 2075 will probably notice limits in my framing that look as natural to me as hydraulics did to Descartes. Worth keeping going anyway, with any too-clean conclusion held at arm's length.

Theology has been here longest. Dan McClellan, a biblical scholar and Latter-day Saint who won the 2023 Society of Biblical Literature Richards Award, argues that sacred texts don't have inherent meaning. The Bible doesn't, by itself, say anything. Meaning arises when a conscious reader engages the text, and what emerges is a negotiation. Shaped by the language the reader speaks, the culture they grew up in, the historical moment they're in, the identity they carry to the page. The Bible isn't univocal. Priestly texts, prophetic texts, and wisdom literature disagree about basic questions. The tradition preserved the disagreements instead of resolving them. McClellan traces an evolution in the Israelite conception of God from henotheism, where their God was supreme among many, to monotheism. The understanding evolved. The texts record the evolution.

If the Torah functions as a specification for human behavior, as I think it does, McClellan is describing the oldest documented instance of the specification gap. The text was always multi-authored, internally contradictory, and insufficient to carry the qualitative signal it was trying to transmit. Three thousand years of Talmudic commentary might be a heroic attempt to decompress a signal that was lossy at the point of encoding. Every mystical tradition in every culture converges on the same conclusion. The deepest contact with the sacred isn't linguistic. Contemplation, not study. Silence, not sermon.

Linguistics is where the wall is fighting its latest battle. Noam Chomsky, whose Universal Grammar dominated academic linguistics for half a century, holds that language models are fundamentally incapable of understanding language. Emily Bender, co-author of the 2021 "Stochastic Parrots" paper, puts it more bluntly. LLMs stitch together linguistic forms "without any reference to meaning." On the other side, the cognitive scientist Steven Piantadosi argues that LLMs refute the Chomskyan project entirely. Grammar, he says, emerges from statistical patterns, with no innate organ needed.

What's striking is what's shared across the disagreement. Chomsky and Bender both hold that LLMs manipulate form without meaning. Piantadosi would say that statistical patterns *are* how language works, which dissolves the form-meaning distinction rather than confirming it. Even on his account, what the model's doing is learning patterns from text produced by humans. If there's meaning in the output, it came from the humans who wrote the training data. The model is downstream of conscious interpreters either way.

| Domain | Formal side |   | Qualitative side |
| --- | --- | --- | --- |
| Engineering | system prompt | ⊬ | judgment |
| Philosophy | physical description | ⊬ | quale |
| Linguistics | linguistic form | ⊬ | meaning |
| Theology | scripture | ⊬ | encounter |
| Neuroscience | neural correlate | ⊬ | consciousness |

In each row, meaning lives in the conscious interpreter, not in the text. If current language models aren't conscious interpreters, which IIT predicts because during inference they have approximately zero integrated information, then they produce text. The meaning lives elsewhere, in the human reading the output. AI alignment has its own version of this. The loss function ⊬ human values.

The convergence is striking. The Gospel of John opens with the Logos, meaning reason, pattern, the rational structure underlying reality, named as prior to matter. Classical Indian philosophy arrives somewhere similar through different machinery. Consciousness isn't something individuals happen to have; it's what reality fundamentally is. These traditions didn't coordinate with each other, or with IIT, or with McClellan, or with Bender. They arrive at structurally similar conclusions anyway. The qualitative is prior to the quantitative. Materialism says mind emerged from mindless matter. IIT and panpsychism say matter was never mindless. The Logos tradition says mind was there first. These claims diverge in their details. They share a single rejection: the idea that the qualitative could be derived from the quantitative. An invariant gap across formal systems, discovered independently by fields that never coordinated, is how science confirms the existence of real structures. We didn't find gravity by one experiment. We found it because every experiment that probed for it found it in the same place.

## VI. What the Work Costs

For the last two years, every vendor demo I've sat through has promised some version of the same machine. One that'll do what you meant instead of what you said. The pitch rotates through different words. Agent. Copilot. Assistant. Automation. The promise underneath doesn't change: give the system enough context and it'll exercise judgment for you, filling in what you didn't specify and handling what you didn't anticipate.

A lot of what gets sold as AI engineering is premised on a misunderstanding of what the tools can do. Some of it is premised on pretending the misunderstanding isn't there. None of this is to say the tools are useless. They do real work, including work I depend on every day. The argument is about the gap between what they do and what they're being sold as doing.

The industry's default response to every limit is to reach for more. Bigger models. Longer context. Larger training sets. The move has worked for most of the capabilities the field has wanted so far, and it's reasonable to assume it'll keep working in many directions. It won't work for this one. The wall is a category limit. Capacity has nothing to do with it. More parameters produce a more articulate system running into the same wall.

There's a real trade-off at the bottom of this, and the industry is currently pretending it doesn't exist. You can have autonomy. You can have reliably bounded behavior. You can have judgment that survives situations you didn't anticipate. You can't have all three. Bounded behavior requires formal specification. Formal specification is what the wall excludes from the qualitative. So an agent with the judgment to handle unanticipated situations is also, necessarily, an agent you haven't fully specified. Theology noticed this centuries ago and called it the Free Will Defense. Genuine agency requires the real possibility of failure, and a creator who permits no error is also permitting no real choice.

The pattern I keep seeing with teams adopting AI is that they want the fully autonomous agent, the one that decides on its own, before they have the agent that asks for help when it's uncertain, before they have the agent that executes narrow tasks under supervision. They skip the versions where humans remain the interpreter and reach for the version where the model is. What they're reaching for is precisely what the wall forbids. The symptom is the agent I described in Section I. Creative and dangerous in the same breath, because both capacities come from the same absence of constraint.

Every field at the wall lands on the same observation. A text has no meaning without a reader. A shader has no beauty without someone to see the light bending. A theorem has no elegance without a mind held by it. **Encounter cannot be replaced by description.** Not for God communicating with humans. Not for a system prompt communicating with a model. Not for one person trying to tell another person what they mean.

None of this means AI consciousness is impossible in principle. If panpsychism is something like right, the wall lives between formal description and experience, not between matter and experience itself. Some future system might cross it. The path wouldn't be language. Probably not silicon either. It would take a kind of embodiment we can't yet imagine. That's far from where we are. LLMs are here now, and the work in front of us is using them honestly.

The deepest engineering insight from all of this might be that the most important thing about an autonomous agent isn't what it does while autonomous. It's what happens at the interface between the agent and the conscious interpreter. The human who reads the output, evaluates the action, decides whether to trust it. The interpreter is the re-admission, into an engineering process, of the qualitative that our methodology was specifically built to exclude. They're the part of the system that's allowed to see what the tools, by construction, can't. That interface is where the work actually happens. How you design it, how you surface context, expose reasoning, carry uncertainty, invite correction, is closer to the heart of this discipline than any improvement to the model.

There's a texture to working on the wrong side of a wall you know is there. For most of software's history, you could stay on the quantitative side of Galileo's line. You could spend a whole career there. Requirements, tests, contracts, type systems. The material is quantitative because the discipline is. Even the statistical parts (search, recommendation, UX) had the decency to be measurable. AI engineering doesn't let you stay there. The material itself straddles the wall. Every decision about what to put in a prompt, which examples to include, how to word an evaluation, when to escalate to a human, is a decision about what to encode in symbols and what to leave to interpretation. And the interesting decisions keep turning out to be the ones about what to leave out.

At the end of some working sessions I notice myself thinking in vocabulary I didn't need before. *Intentionality*. *Hermeneutics*. *Qualia*. *Specification gap*. The work kept asking questions the older vocabulary of *correctness*, *latency*, *coverage* couldn't cleanly answer, so I started reading philosophy. Once I did, it was clear other fields had been working on these questions for a long time, and that there was real value in thinking through the problem from outside engineering. When your code is a string of English prose that's going to be interpreted by a statistical process you can't step through, debugging starts to resemble textual criticism more than stack tracing.

The system prompt is a mirror. Writing one forces you to confront how much of your own judgment you can't specify. You sit down to describe what you want. Your sentences get longer. You add constraints. You add examples. You add edge cases. And somewhere around the third revision you realize you're trying to compress into text an understanding that lives in years with clients, or decades of writing code, or a whole life of reading people. The usual engineering sense of lossy compression says some information is missing. This is deeper than that. The thing you're compressing was never in the form of symbols to begin with. Introspection itself is lossy compression. We can't fully specify, even to ourselves, why we believe what we believe. Gazzaniga's left-brain interpreter, the hemisphere that invents explanations for actions it didn't cause, describes normal human cognition. It shows up in all of us. Sometimes a thin prompt is just a thin prompt. Plenty of things can be specified, and sometimes the prompt is just bad. But when you've sharpened it as far as it'll go and the system still keeps missing in the same way, the thing you're trying to write down was maybe never meant to be encoded in language.

What do you do, then, in a discipline whose foundational tools weren't built for what we're now asking them to do?

I don't have a clean answer. I have a posture I've started to inhabit without fully noticing. Not in what I build. In how I stand while building. I assume my specifications are incomplete and I design around the assumption. I spend more time on evaluators than I do on prompts, because the evaluator is the conscious interpreter the system by itself can't be. And when philosophical vocabulary surfaces in my head mid-debug, I take it seriously. It's usually telling me the honest name for what I'm trying to do.

Three more specific moves come from working this way for long enough.

The first is treating autonomy as a calibration, not a target. The trichotomy is real. You can't have full autonomy and bounded behavior and judgment all at once. So autonomy has to be matched to the trust relationship between the human and the system. Less autonomy is the right answer for most cases. The push to fully-autonomous-everywhere, where agents decide on their own across whole workflows, is engineering hubris. Most production systems should be doing less than they're doing. Autonomy isn't a property to maximize. It's a calibration to how much trust the situation actually permits.

The second is preferring observability to correctness. You can't make an LLM-driven system right. You can make its behavior legible. Surface its reasoning. Expose its uncertainty. Log enough state that a human can audit after the fact and understand what happened. Specification gets replaced in primacy by traceability. The system isn't trustworthy because it's correct. The system is trustworthy because when it fails, you can see why.

The third is recognizing the "more context" anti-pattern. The default response to a failing prompt is to add more constraints, more examples, more context. The wall says: for some failures, that's exactly wrong. Sometimes more context narrows the gap. Sometimes more context is wallpapering over the recognition that the task wasn't formalizable in the first place. The new judgment call is figuring out which case you're in. When you've crossed from "the prompt needs more information" to "this task needs a human to remain the interpreter," more context makes the system less honest, not more capable.

---

Three hours into the agent debug, the connection was suddenly there. The thing I'd been calling a UX problem back then was the same boundary I was hitting now. I'd been working on the wall since I was twenty-two. The years I'd spent failing to close it had been, in a strange way, the most honest intellectual work I'd ever done.

I didn't have the vocabulary for it then. I do now. It was the wall. It has always been the wall.

The wall hasn't changed. I have. I stopped treating it as a bug and started treating it as the terrain.

I don't know if that makes the work easier or harder. I know it makes it more honest. I know that the systems I build now are built with the awareness that the most important parts of them are the parts I can't write down. And I know I'll keep building anyway, because the wall is where the interesting problems are, and I don't have a better place to spend a career.
