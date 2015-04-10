A VM that uses JSON encoding

Unlike other VMs like JVM or Dalvik or CLR, this VM is not byte code based but JSON based. It also neither stack based nor register based.

This VM is different in other VM style; it is continuation passing style, means there are no implicit "next" instruction, all control transfer is explicit specified. Furthermore, it natively supports parallel programming, it would be very easy to specify that actions can perform at no pre-defined order and specify action should occur when more than one other actions has been performed.

The first version of this VM will be untyped, but it is planed to add type check and type inference in the future.

The use of JSON for VM data encoding is that it provides both simple (but clear) grammar and portability.

To bootstrap a simple implementation (basically less then 200 lines of JavaScript) will be provided, and then some hand coded VM code examples will be provided (as test case).