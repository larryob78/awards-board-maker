"""Isolated child: apply process limits before executing fixed Ghostscript argv."""
import os
import resource
import sys

resource.setrlimit(resource.RLIMIT_CPU, (20, 20))
resource.setrlimit(resource.RLIMIT_FSIZE, (32_000_000, 32_000_000))
resource.setrlimit(resource.RLIMIT_NOFILE, (64, 64))
# Darwin may reject lowering this limit; CPU/file/descriptor/time/pixel bounds still apply.
try:
    resource.setrlimit(resource.RLIMIT_DATA, (536_870_912, 536_870_912))
except (ValueError, OSError):
    pass
os.execv('/opt/homebrew/bin/gs', ['/opt/homebrew/bin/gs', *sys.argv[1:]])
