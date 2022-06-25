function interpret(input_tree)
{
	var functions = []
	var gresult = ""
	var error_msg = undefined
	var eval = function(ast, vars)
	{
		if (ast == undefined) return undefined
		if (ast.type == "int" || ast.type == "double" || ast.type == "string" || ast.type == "char") return ast.value
		if (ast.type == "ident")
		{
			for (var i = 0; i < vars.length; i++)
				if (vars[i].name == ast.value)
					return vars[i].value
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
			if (ast.name == "add") return ast.children.length == 2 ? eval(ast.children[0], vars) + eval(ast.children[1], vars) : undefined
			if (ast.name == "sub") return ast.children.length == 2 ? eval(ast.children[0], vars) - eval(ast.children[1], vars) : undefined
			if (ast.name == "times") return ast.children.length == 2 ? eval(ast.children[0], vars) * eval(ast.children[1], vars) : undefined
			if (ast.name == "div") return ast.children.length == 2 ? eval(ast.children[0], vars) / eval(ast.children[1], vars) : undefined
			if (ast.name == "mod") return ast.children.length == 2 ? eval(ast.children[0], vars) % eval(ast.children[1], vars) : undefined
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
			if (ast.name == "min") return ast.children.length == 1 ? -eval(ast.children[0], vars) : undefined
			if (ast.name == "le") return ast.children.length == 2 ? eval(ast.children[0], vars) < eval(ast.children[1], vars) : undefined
			if (ast.name == "lt") return ast.children.length == 2 ? eval(ast.children[0], vars) <= eval(ast.children[1], vars) : undefined
			if (ast.name == "ge") return ast.children.length == 2 ? eval(ast.children[0], vars) > eval(ast.children[1], vars) : undefined
			if (ast.name == "gt") return ast.children.length == 2 ? eval(ast.children[0], vars) >= eval(ast.children[1], vars) : undefined
			if (ast.name == "eq") return ast.children.length == 2 ? eval(ast.children[0], vars) == eval(ast.children[1], vars) : undefined
			if (ast.name == "ne") return ast.children.length == 2 ? eval(ast.children[0], vars) != eval(ast.children[1], vars) : undefined
			if (ast.name == "and") return ast.children.length == 2 ? eval(ast.children[0], vars) && eval(ast.children[1], vars) : undefined
			if (ast.name == "or") return ast.children.length == 2 ? eval(ast.children[0], vars) || eval(ast.children[1], vars) : undefined
			if (ast.name == "not") return ast.children.length == 1 ? !eval(ast.children[0], vars) : undefined
			if (ast.name == "ass")
			{
				if (ast.children.length != 2) return undefined
				if (ast.children[0].type != "ident") return undefined
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
				if (ast.children.length != 2) return undefined
				if (ast.children[1].type != "ident") return undefined
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
				if (ast.children.length != 1) return undefined
				var v = eval(ast.children[0], vars)
				gresult += v + "\n"
				return v
			}
			if (ast.name == "prompt")
			{
				if (ast.children.length != 1) return undefined
				var msg = eval(ast.children[0], vars)
				var v = prompt(msg)
				if (/^[-+]?(\d+|Infinity)$/.test(v)) v = Number(v)
				return v
			}
			if (ast.name == "ifthenelse")
			{
				if (ast.children.length != 3) return undefined
				return eval(ast.children[0], vars) == true ? eval(ast.children[1], vars) : eval(ast.children[2], vars)
			}
			if (ast.name == "whenotherwise")
			{
				if (ast.children.length != 3) return undefined
				return eval(ast.children[1], vars) == true ? eval(ast.children[0], vars) : eval(ast.children[2], vars)
			}
			if (ast.name == "while")
			{
				if (ast.children.length != 2) return undefined
				var s = undefined
				while (eval(ast.children[0], vars) == true)
					s = eval(ast.children[1], vars)
				return s
			}
			if (ast.name == "defaultsto")
			{
				if (ast.children.length != 2) return undefined
				var v = eval(ast.children[0], vars)
				return v != undefined ? v : eval(ast.children[1], vars)
			}
			if (ast.name == "fndef")
			{
				if (ast.children.length != 3) return undefined
				functions[ast.children[0].value] = { params: ast.children[1], body: ast.children[2] }
				return undefined
			}
			if (ast.name == "fncall")
			{
				if (ast.children.length != 2) return undefined
				var fn = functions[ast.children[0].value]
				if (fn == undefined) return undefined
				var params = []
				for (var i = 0; i < fn.params.children.length; i++)
					params.push({ name: fn.params.children[i].value, value: (i < ast.children[1].children.length ? eval(ast.children[1].children[i], vars) : undefined) })
				return eval(fn.body, params);
			}
		}
		return undefined
	}
	if (input_tree == false)
		return "  ?"
	var result = eval(input_tree, [])
	if (error_msg != undefined)
		return "  ?"
	else
		return result
}
