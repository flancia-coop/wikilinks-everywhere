#!/bin/bash
# script to export zipfile
shadow-cljs compile extension
rm extension.zip
zip extension.zip -r -@ < files.txt
