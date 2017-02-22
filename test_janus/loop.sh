#!/bin/bash - 
#===============================================================================
#
#          FILE:  loop.sh
# 
#         USAGE:  ./loop.sh 
# 
#   DESCRIPTION:  loop node js
# 
#       OPTIONS:  ---
#  REQUIREMENTS:  ---
#          BUGS:  ---
#         NOTES:  ---
#        AUTHOR: Lai Chen (A program fan), lchen@grandstream.com or (chenlai19891007@163.com)
#       COMPANY: Grandstream
#       CREATED: 2017/02/21 19时18分45秒 CST
#      REVISION:  ---
#===============================================================================

set -o nounset                              # Treat unset variables as an error
echo `pwd`

Loop_Num=2
Node_Path=/Users/yanyandong/.nvm/versions/node/v6.9.4/bin

for a in Loop_Num do
	#/Users/yanyandong/.nvm/versions/node/v6.9.4/bin/node connect_janus.js > /dev/null &
	./shell_janus.js > /dev/null &
	echo "loop time $a"
done
