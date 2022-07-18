function interpret(input_tree)
{
	var functions = []
	var gresult = ""
	var error_msg = undefined
	var eval = function(ast, vars)
	{
		if (error_msg != undefined) return undefined
		if (ast == undefined) return undefined
		if (ast.type == "int" || ast.type == "double" || ast.type == "string" || ast.type == "char") return ast.value
		if (ast.type == "ident")
		{
			for (var i = 0; i < vars.length; i++)
				if (vars[i].name == ast.value)
					return vars[i].value
			error_msg = "Variable '"+ast.value+"' has no value"
			return undefined
		}
		if (ast.children == undefined) return undefined
		if (ast.type == "list")
		{
			var s = undefined
			for (var i = 0; i < ast.children.length; i++)
				s = eval(ast.children[i], vars)
			return s
		}
		if (ast.type == "tree")
		{
			if (ast.name == "true") return true
			if (ast.name == "false") return false
			if (ast.name == "add")
			{
				if (ast.children.length != 2)
				{
					error_msg = "[add] should have two child trees"
					return undefined
				}
				return eval(ast.children[0], vars) + eval(ast.children[1], vars)
			}
			if (ast.name == "sub")
			{
				if (ast.children.length != 2)
				{
					error_msg = "[sub] should have two child trees"
					return undefined
				}
				return eval(ast.children[0], vars) - eval(ast.children[1], vars)
			}
			if (ast.name == "times")
			{
				if (ast.children.length != 2)
				{
					error_msg = "[times] should have two child trees"
					return undefined
				}
				return eval(ast.children[0], vars) * eval(ast.children[1], vars)
			}
			if (ast.name == "div")
			{
				if (ast.children.length != 2)
				{
					error_msg = "[div] should have two child trees"
					return undefined
				}
				return eval(ast.children[0], vars) / eval(ast.children[1], vars)
			}
			if (ast.name == "mod")
			{
				if (ast.children.length != 2)
				{
					error_msg = "[mod] should have two child trees"
					return undefined
				}
				return eval(ast.children[0], vars) % eval(ast.children[1], vars)
			}
			if (ast.name == "sum")
			{
				var childs = (ast.children.length == 1 && ast.children[0] != undefined && ast.children[0].type == "list") ? ast.children[0].children : ast.children
				var s = 0
				for (var i = 0; i < childs.length; i++)
					s += eval(childs[i], vars)
				return s
			}
			if (ast.name == "multiply")
			{
				var childs = (ast.children.length == 1 && ast.children[0] != undefined && ast.children[0].type == "list") ? ast.children[0].children : ast.children
				var s = 1
				for (var i = 0; i < childs.length; i++)
					s *= eval(childs[i], vars)
				return s
			}
			if (ast.name == "min") 
			{
				if (ast.children.length != 1)
				{
					error_msg = "[min] should have one child tree"
					return undefined
				}
				return -eval(ast.children[0], vars)
			}
			if (ast.name == "le") 
			{
				if (ast.children.length != 2)
				{
					error_msg = "[le] should have two child trees"
					return undefined
				}
				return eval(ast.children[0], vars) < eval(ast.children[1], vars)
			}
			if (ast.name == "lt") 
			{
				if (ast.children.length != 2)
				{
					error_msg = "[lt] should have two child trees"
					return undefined
				}
				return eval(ast.children[0], vars) <= eval(ast.children[1], vars)
			}
			if (ast.name == "ge") 
			{
				if (ast.children.length != 2)
				{
					error_msg = "[ge] should have two child trees"
					return undefined
				}
				return eval(ast.children[0], vars) > eval(ast.children[1], vars)
			}
			if (ast.name == "gt") 
			{
				if (ast.children.length != 2)
				{
					error_msg = "[gt] should have two child trees"
					return undefined
				}
				return eval(ast.children[0], vars) >= eval(ast.children[1], vars)
			}
			if (ast.name == "eq") 
			{
				if (ast.children.length != 2)
				{
					error_msg = "[eq] should have two child trees"
					return undefined
				}
				return eval(ast.children[0], vars) == eval(ast.children[1], vars)
			}
			if (ast.name == "ne") 
			{
				if (ast.children.length != 2)
				{
					error_msg = "[ne] should have two child trees"
					return undefined
				}
				return eval(ast.children[0], vars) != eval(ast.children[1], vars)
			}
			if (ast.name == "and") 
			{
				if (ast.children.length != 2)
				{
					error_msg = "[and] should have two child trees"
					return undefined
				}
				return eval(ast.children[0], vars) && eval(ast.children[1], vars)
			}
			if (ast.name == "or") 
			{
				if (ast.children.length != 2)
				{
					error_msg = "[or] should have two child trees"
					return undefined
				}
				return eval(ast.children[0], vars) || eval(ast.children[1], vars)
			}
			if (ast.name == "not") 
			{
				if (ast.children.length != 2)
				{
					error_msg = "[not] should have one child tree"
					return undefined
				}
				return !eval(ast.children[0], vars)
			}
			if (ast.name == "ass")
			{
				if (ast.children.length != 2)
				{
					error_msg = "[ass] should have two child trees"
					return undefined
				}
				if (ast.children[0].type != "ident")
				{
					error_msg = "[ass] expect first child tree to be an ident"
					return undefined
				}
				var n = ast.children[0].value
				var v = eval(ast.children[1], vars)
				for (var i = 0; i < vars.length; i++)
					if (vars[i].name == n)
					{
						vars[i].value = v
						return v
					}
				vars.push({ name:n, value:v })
				return v
			}
			if (ast.name == "assto")
			{
				if (ast.children.length != 2)
				{
					error_msg = "[assto] should have two child trees"
					return undefined
				}
				if (ast.children[0].type != "ident")
				{
					error_msg = "[assto] expect second child tree to be an ident"
					return undefined
				}
				var n = ast.children[1].value
				var v = eval(ast.children[0], vars)
				for (var i = 0; i < vars.length; i++)
					if (vars[i].name == n)
					{
						vars[i].value = v
						return v
					}
				vars.push({ name:n, value:v })
				return v
			}
			if (ast.name == "print")
			{
				if (ast.children.length != 1)
				{
					error_msg = "[print] should have one child tree"
					return undefined
				}
				var v = eval(ast.children[0], vars)
				gresult += v + "\n"
				return v
			}
			if (ast.name == "shout")
			{
				if (ast.children.length != 1)
				{
					error_msg = "[shout] should have one child tree"
					return undefined
				}
				var v = eval(ast.children[0], vars)
				gresult += v.toString().toUpperCase() + "!\n"
				return v
			}
			if (ast.name == "prompt")
			{
				if (ast.children.length != 1)
				{
					error_msg = "[prompt] should have one child tree"
					return undefined
				}
				var msg = eval(ast.children[0], vars)
				var v = prompt(msg)
				if (/^[-+]?(\d+|Infinity)$/.test(v)) v = Number(v)
				return v
			}
			if (ast.name == "ifthenelse")
			{
				if (ast.children.length != 3)
				{
					error_msg = "[ifthenelse] should have three child trees"
					return undefined
				}
				return eval(ast.children[0], vars) == true ? eval(ast.children[1], vars) : eval(ast.children[2], vars)
			}
			if (ast.name == "whenotherwise")
			{
				if (ast.children.length != 3)
				{
					error_msg = "[whenotherwise] should have three child trees"
					return undefined
				}
				return eval(ast.children[1], vars) == true ? eval(ast.children[0], vars) : eval(ast.children[2], vars)
			}
			if (ast.name == "while")
			{
				if (ast.children.length != 2)
				{
					error_msg = "[while] should have two child trees"
					return undefined
				}
				var s = undefined
				while (eval(ast.children[0], vars) == true)
					s = eval(ast.children[1], vars)
				return s
			}
			if (ast.name == "defaultsto")
			{
				if (ast.children.length != 2)
				{
					error_msg = "[defaultsto] should have two child trees"
					return undefined
				}
				var v = eval(ast.children[0], vars)
				return v != undefined ? v : eval(ast.children[1], vars)
			}
			if (ast.name == "fndef")
			{
				if (ast.children.length != 3)
				{
					error_msg = "[fndef] should have three child trees"
					return undefined
				}
				if (ast.children[0].type != "ident")
				{
					error_msg = "[fndef] expects first child to be an identifier"
					return undefined
				}
				if (ast.children[1].type != "list")
				{
					error_msg = "[fndef] expects second child to be a list of identifiers"
					return undefined
				}
				functions[ast.children[0].value] = { params: ast.children[1], body: ast.children[2] }
				return undefined
			}
			if (ast.name == "fncall")
			{
				if (ast.children.length != 2)
				{
					error_msg = "[fncall] should have three child trees"
					return undefined
				}
				if (ast.children[0].type != "ident")
				{
					error_msg = "[fncall] expects first child to be an identifier"
					return undefined
				}
				if (ast.children[1].type != "list")
				{
					error_msg = "[fncall] expects second child to be a list of expressions"
					return undefined
				}
				var fn = functions[ast.children[0].value]
				if (fn == undefined)
				{
					error_msg = "'"+ast.children[0].value+"' is not defined as a function"
					return undefined
				}
				var params = []
				for (var i = 0; i < fn.params.children.length; i++)
					params.push({ name: fn.params.children[i].value, value: (i < ast.children[1].children.length ? eval(ast.children[1].children[i], vars) : undefined) })
				return eval(fn.body, params);
			}
			error_msg = "[" + ast.name + "] is unknown\n"
		}
		return undefined
	}
	if (input_tree == false)
		return "  ?"
	var result = eval(input_tree, [])
	if (error_msg != undefined)
		return "  ? " + error_msg
	else if (gresult != "")
		return gresult
	else
		return result
}
