import os
import sys
import subprocess
import shutil

if 'PULSE_BUILD_NUMBER' not in os.environ:
    os.environ['PULSE_BUILD_NUMBER'] = '0'
    os.environ['PULSE_BUILD_REVISION'] = '0'

subprocess.check_call('npm install', shell=True)
if sys.platform == 'win32':
    subprocess.check_call('pkg package.json -t node12-win-x64', shell=True)
    subprocess.check_call('npm run dist-win', shell=True)
elif sys.platform == 'darwin':
    subprocess.check_call('pkg package.json -t node12-macos-x64', shell=True)
    subprocess.check_call('npm run dist-mac', shell=True)
else:
    subprocess.check_call('pkg package.json -t node12-linux-x64', shell=True)
    subprocess.check_call('npm run dist-linux', shell=True)
