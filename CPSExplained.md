# Continuation-passing Style With Explicit Context - Explained #

## Introduction ##
Abstract Virtual Machine uses a variation of continuation-passing style, in which there are no explicit contexts (i.e. global variables, local variables, etc) available for each "step"s of the VM.

There are several reason to make this decision.

### Continuation-passing Style ###
Why using CPS? Why not just functional programming (probably with monads)?

First of all, although most of programmers are not familiar with CPS, the fact is that CPS represents a more natural model of computation. When look at the physical level of a computer, you will understand that everything is running in a "trigger-respond" mode, not "call-return" mode. It is the same for our brain, or living cells. In those systems, the trigger and the respond receiver are typically separated by both time and space. It is why CPS looks so natural for concurrent programming: this is the way the world works.

Second, CPS forces us to split a big computation into small pieces or steps. This is very good for a VM in this form.

Third, CPS has bee proved being able to implement all other kinds of flow control, including but not limited to loop/branch/break/continue/deep return/exceptions/return multiple values/co-routine/...

The Curry-Howard isomorphism also shows that  the correspondence of type system for functional semantic is intuitive logic or minimal logic. However, CPS type system correspond to the full classical logic, which gives another benefit for using CPS.

### Explicit Context ###
Now I want to explain why capturing context are not allowed. This idea was bought from C++11 lambda expressions but I found it is very useful.

The first issue to capture context is it increases the difficulty of implementation. By forcing the continuations can only access the values that we passed to it explicitly (by binding or by passing on execute), the implementation becomes trivial.

The second issue is it ensures locality. Locality is pretty important for large programs, and is vital for the VM design. By preventing access a variable that comes from somewhere else, one can just look at a small piece of code and find which parameter is gone wrong.

The third, locality reduces the code analysis work. For complicated programs, it will be hard or impossible to prove a specific optimization could be applied. However, being highly localized, code analysis can be done part by part and applied to the code of as big as possible.

# The Curry-Howard isomorphism #

Now I want to show how CHi apply to our type system. In similar discussion for functional system usually people are talking about function types and implication, product type (tuple) and conjuntion, etc. And by CHi we do know that we cannot have a single function type to form all types since the implication is insufficient for intuitive logic.

So what are the types in our CPS system and how they related to logic concepts? In our system, the fundamental cells are continuations - a thing that can pass to other continuations or being executed. When being executed, zero or more parameters can be passed to. What is the correspondence of it in logic? Is it sufficient to form classical logic?

Unlike functions, our continuations do not return a value. So its type depends on only the types of its parameters. So basically the type of a continuation is a list of types. I will use `[a,b]` for a binary continuation. So now let's look at it.

Because the function type `a -> b` has been proved correspondent to implications, so let's consider how to implement something like that.

As we have seen, the major different of a function and a continuation is that a function returns a value, whilst a continuation do not. The only way that a continuation "return" a value is call one of its parameters to return control to the caller. Because the return value have to have a type, the simplest signature of a function like continuation would look like `[a,[b]]`.

That means an implication `A => B` correspond to `[a,[b]]`. It looks strange first: in the implication, `A` and `B` look like in the same position, but in the continuation type `[a,[b]]` the `a` and `b` are not. When you think about it you will understand that because `A => B` is not equal to `B => A` so this is exactly expected.