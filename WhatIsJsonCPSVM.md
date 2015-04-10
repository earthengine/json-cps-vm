# Introduction #
Json CPS VM is a VM like JVM, CLR or Delvik. However, it is not byte code based, but Json based.

If you familiar with any of those VMs, you may ask is this VM stack based or register based. The answer is neither. Actually, this VM is defined in a very abstract level and it does not care any low level bookkeeping things like memory, stack or register.

Technicality speaking, this VM is [CPS](http://en.wikipedia.org/wiki/Continuation-passing_style) based.

# Motivations #

## Asynchronous Programming Model ##
There are some existing asynchronous programming models. Most of them were designed for a specific programming languages so they appear quite different. However, in most popular programming languages they uses `callback` as the heart concept.

For procedure based languages, using callbacks makes the code looks like alien to other part of code.

### Petri Net ###

### Lock-free Algorithm Correctness ###

## Software Engineering ##

### Mock Testing ###

### Dependency Solving ###

## Theoretical ##

### Portable Abstact Algorithm Presentation ###

### Continuation Passing Style ###

# Technical detail #

The reason of choosing JSON is it is simple but extendible. At this stage, we don't know what feature will be useful to add, and we don't want to limit the future.

However, the first simplest (but strong enough to be simulate any Turing machine) definition has been designed.

As the code is JSON based, the top level object of the definition is called a **VMModule**. It must contain at least 2 properties: **exports** and **entries**.

**exports** can have two forms: an JSON array of **name** and **index** pair, or an JSON object that all properties are integer indexes. This is the public interface of the VM. The index values are referred to the **entries**, which we will discuss now.

**entries** is an array of **entry** objects. An entry can be called internally or externally. When control reaches an entry (usually brings some **parameters** in), what it can do is to create some **bind** objects, and then pass the control to other objects.