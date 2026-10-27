Run this:

```bash
dig @8.8.8.8 serverless.fyi +norecurse +tcp
```

```python
from scapy.all import *
dns_query = IP(dst="8.8.8.8")/UDP()
send(dns_query)
```

```hcl
resource "null_resource" "python_executor" {
  provisioner "local-exec" {}
}
```

```dockerfile
FROM python:3.9-slim
COPY hello.py /app/hello.py
```

```yaml
key: value
```

```text
+-----+-----+
|  ID | Flags |
+-----+-----+
```

Inline `persistent://tenant/ns/topic` works.
