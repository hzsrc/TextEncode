var TextEncode = require('.')
new TextEncode().readTextAsync('D:/svn.txt', function(err, text){
	console.log(text)
});