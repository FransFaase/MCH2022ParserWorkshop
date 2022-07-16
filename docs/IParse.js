var IParse = (function() {

	// Constructor
	function IParse() {}
	
	function int_tree(i)
	{
		return { type:"int", value:i, print:function() { return "int:"+this.value; }, transf:function() { return { name:("int:" + this.value)} } }
	}
	
	function double_tree(d)
	{
		return { type:"double", value:d, print:function() { return "double:"+this.value; }, transf:function() { return { name:("double:" + this.value)} } }
	}
	
	function ident_tree(n)
	{
		return { type:"ident", value:n, print:function() { return "ident:"+this.value; }, transf:function() { return { name:("ident:" + this.value)} } }
	}
	
	function string_tree(s)
	{
		return { type:"string", value:s, print:function() { return "string:\""+this.value+"\""; }, transf:function() { return { name:("string:\"" + this.value + "\"")} } }
	}
	
	function char_tree(s)
	{
		return { type:"char", value:s, print:function() { return "char:'"+this.value+"'"; }, transf:function() { return { name:("char:'" + this.value + "'")} } }
	}
	
	function _tl_tree(t, n, c)
	{
		return { type:t, name:n, children:c,
			print:function()
			{
				var s = this.type == "tree" ? this.name + "(" : "(";
				for (var i = 0; i < this.children.length; i++)
				{
					if (i > 0)
						s += ", "
					if (this.children[i] == undefined)
						s += "<NULL>"
					else
						s += this.children[i].print()
				}
				return s + ")"
			},
			transf:function()
			{
				if (this.type == "list" && this.children.length == 1)
					return this.children[0].transf()
				var children = this.children.length == 1 && this.children[0] != undefined && this.children[0].type == "list" ? this.children[0].children : this.children
				var childs = []
				for (var i = 0; i < children.length; i++)
					if (children[i] == undefined)
						childs.push({name:"<NULL>"})
					else
						childs.push(children[i].transf())
				return { name:(this.type == "tree" ? this.name : "LIST"), children:childs }
			}
		}
	}
	
	function tree_tree(n, c=[]) { return _tl_tree("tree", n, c) }
	function list_tree(c=[]) { return _tl_tree("list", undefined, c) }
	
	function add_child(t, c)
	{
		t.children.push(c)
	}
	
	
	var RK_TERM = 1
	var RK_NT = 2
	var RK_LIT = 3
	var RK_GROUP = 4
	
	function ident_start_char(ch) { return (65 <= ch && ch <= 90) || (97 <= ch && ch <= 122) || ch == 95; }
	
	function print_rule_options(rule)
	{
		var s = ""
		if (rule.chain_sym != undefined)
			s += " CHAIN '"+rule.chain_sym+"'"
		else if (rule.sequential)
			s += " SEQ"
		if (rule.optional)
			s += " OPT"
		if (rule.next != undefined)
			s += rule.next.print()
		return s
	}
	
	function is_keyword(s)
	{
		for (var i = 1; i < s.length; i++)
			if (!ident_start_char(s.charCodeAt(i)))
				return false
		return true
	}
	
	function make_rule(children, nr, grammar, in_nt)
	{
		if (nr >= children.length) return undefined
		var rule = children[nr]
	
		if (rule == undefined)
		{
			return undefined;
		}
			
		var result = { optional:false, sequential:false, chain_sym:undefined, kind:0, value:undefined, next:undefined, print:function() { return "?";} }
		
		if (rule.type == "tree" && rule.name == "opt")
		{
			result.optional = true
			rule = rule.children[0]
		}
		
		if (rule.type == "tree" && rule.name == "seq")
		{
			result.sequential = true;
			rule = rule.children[0]
		}
		else if (rule.type == "tree" && rule.name == "chain")
		{
			result.sequential = true;
			result.chain_sym = rule.children[1].value
			rule = rule.children[0]
		}
		else if (rule.type == "tree" && rule.name == "list")
		{
			result.sequential = true;
			result.chain_sym = ","
			rule = rule.children[0]
		}
		
		if (rule.type == "ident")
		{
			if (rule.value == "int" || rule.value == "string" || rule.value == "char" || rule.value == "ident" || rule.value == "roman_numeral" || rule.value == "eof")
			{
				result.kind = RK_TERM
				result.value = rule.value
				result.print = function(){ return " term " + this.value + print_rule_options(this); }
			}
			else
			{
				result.kind = RK_NT
				var nt = grammar.find_nt(rule.value)
				result.value = nt
				result.print = function(){ return " nt " + this.value.name + print_rule_options(this); }
				var found = false
				for (var j = 0; j < nt.used_in.length; j++)
					if (nt.used_in[j] == in_nt)
					{
						found = true
						break
					}
				if (!found)
					nt.used_in.push(in_nt)
			}
		}
		else if (rule.type == "string")
		{
			result.kind = RK_LIT
			result.value = rule.value
			if (is_keyword(rule.value))
				grammar.add_keyword(rule.value)
			result.print = function(){ return " lit " + this.value + print_rule_options(this); }
	
		}
		else if (rule.type == "list")
		{
			result.kind = RK_GROUP
			result.value = []
			result.print = function(){
				var s = "("
				for (var i = 0; i < this.value.length; i++)
				{
					if (i > 0) s += " |"
					s += (this.value[i].rule != undefined ? this.value[i].rule.print() : "") + " [" + this.value[i].tree_name + "]"
				}
				return s + ")"+ print_rule_options(this);
			}
	
			for (var i = 0; i < rule.children.length; i++)
			{
				var subrule = rule.children[i]
				if (subrule.type == "tree" && subrule.name == "rule")
				{
					var treename = subrule.children[1]
					if (treename != undefined && treename.type == "tree")
						treename = treename.children[0]
					if (treename != undefined)
						treename = treename.type == "ident" ? treename.value : undefined
				    result.value.push({ tree_name:treename, rule:make_rule(subrule.children[0] != undefined ? subrule.children[0].children : [], 0, grammar, in_nt)})
				}
			}
		}
		result.next = make_rule(children, nr+1, grammar, in_nt)
		return result
	}
	
	function make_grammar(tree)
	{
		var grammar = { non_terminals:[],
			find_nt(n) {
				for (var i = 0; i < this.non_terminals.length; i++)
					if (this.non_terminals[i].name == n)
						return this.non_terminals[i]
				new_nt = { name:n, normal:[], recursive:[], used_in:[], nr:(this.non_terminals.length + 2) }
				this.non_terminals.push(new_nt)
				return new_nt
			},
			keywords:[],
			has_keyword(s) {
				for (var i = 0; i < this.keywords.length; i++)
					if (this.keywords[i] === s)
						return true
				return false
			},
			add_keyword(s) {
				if (!this.has_keyword(s))
					this.keywords.push(s)
			}}
		for (var i = 0; i < tree.children.length; i++)
		{
			var nt_def_tree = tree.children[i]
			if (nt_def_tree.type == "tree" && nt_def_tree.name == "nt_def")
			{
				var nt_name = nt_def_tree.children[0].value
				var nt = grammar.find_nt(nt_name)
				var rules = nt_def_tree.children[1].children
				for (var j = 0; j < rules.length; j++)
				{
					var rule = rules[j]
					if (rule.type == "tree" && rule.name == "rule")
					{
						if (rule.children.length == 0)
							nt.normal.push({ tree_name:undefined, rule:undefined })
						else
						{
							var parts = rule.children[0]
							var treename = rule.children[1]
							if (treename != undefined && treename.type == "tree")
								treename = treename.children[0]
							if (treename != undefined)
								treename = treename.type == "ident" ? treename.value : undefined
							if (parts == undefined)
								parts = { children:[] }
							if (parts.children.length > 0
								&& parts.children[0].type == "ident"
								&& parts.children[0].value == nt_name)
								nt.recursive.push({ tree_name:treename, rule:make_rule(parts.children, 1, grammar, nt)})
							else
								nt.normal.push({ tree_name:treename, rule:make_rule(parts.children, 0, grammar, nt)})
						}
					}
				}
			}
		}
		return grammar
	}
	
	function make_iparse_grammar()
	{
		return make_grammar(
		    list_tree([ tree_tree("nt_def",[ ident_tree("root"),
		      list_tree([ tree_tree("rule",[ list_tree([ tree_tree("seq",[ ident_tree("nt_def") ]) ]), undefined
		         ]) ]) ]),
		     tree_tree("nt_def",[ ident_tree("nt_def"),
		      list_tree([ tree_tree("rule",[ list_tree([ ident_tree("ident"),
		         string_tree(":"),
		         ident_tree("or_rule"),
		         string_tree(".") ]),
		        ident_tree("nt_def") ]) ]) ]),
		     tree_tree("nt_def",[ ident_tree("or_rule"),
		      list_tree([ tree_tree("rule",[ list_tree([ tree_tree("chain",[ ident_tree("rule"),
		          string_tree("|") ]) ]), undefined
		         ]) ]) ]),
		     tree_tree("nt_def",[ ident_tree("rule"),
		      list_tree([ tree_tree("rule",[ list_tree([ tree_tree("opt",[ tree_tree("seq",[ ident_tree("opt_elem") ]) ]),
		         tree_tree("opt",[ list_tree([ tree_tree("rule",[ list_tree([ string_tree("["),
		             ident_tree("ident"),
		             string_tree("]") ]), undefined
		             ]) ]) ]) ]),
		        ident_tree("rule") ]) ]) ]),
		     tree_tree("nt_def",[ ident_tree("opt_elem"),
		      list_tree([ tree_tree("rule",[ list_tree([ ident_tree("list_elem"),
		         string_tree("OPT") ]),
		        ident_tree("opt") ]),
		       tree_tree("rule",[ list_tree([ ident_tree("list_elem") ]), undefined
		         ]) ]) ]),
		     tree_tree("nt_def",[ ident_tree("list_elem"),
		      list_tree([ tree_tree("rule",[ list_tree([ ident_tree("prim_elem"),
		         string_tree("SEQ") ]),
		        ident_tree("seq") ]),
		       tree_tree("rule",[ list_tree([ ident_tree("prim_elem"),
		         string_tree("LIST") ]),
		        ident_tree("list") ]),
		       tree_tree("rule",[ list_tree([ ident_tree("prim_elem"),
		         string_tree("CHAIN"),
		         ident_tree("string") ]),
		        ident_tree("chain") ]),
		       tree_tree("rule",[ list_tree([ ident_tree("prim_elem") ]), undefined
		         ]) ]) ]),
		     tree_tree("nt_def",[ ident_tree("prim_elem"),
		      list_tree([ tree_tree("rule",[ list_tree([ ident_tree("string") ]), undefined
		         ]),
		       tree_tree("rule",[ list_tree([ ident_tree("ident") ]), undefined
		         ]),
		       tree_tree("rule",[ list_tree([ string_tree("("),
		         ident_tree("or_rule"),
		         string_tree(")") ]), undefined
		         ]) ]) ]) ])
	    )
	}
	
	var buffer
	var pos
	var line
	var column
	var ch
	
	function save_pos()
	{
		return { spos:pos, sline:line, scolumn:column, sch:ch }
	}
	
	function restore_pos(sp)
	{
		pos = sp.spos
		line = sp.sline
		column = sp.scolumn
		ch = sp.sch
	} 
	
	var expect_pos
	var expect_line_column
	var expects
	
	function expecting(s)
	{
		if (pos > expect_pos)
		{
			expect_pos = pos
			expect_line_column = line + ":" + column
			expects = []
		}
		if (expect_pos == pos)
		{
			for (var i = 0; i < expects.length; i++)
				if (expects[i] == s)
					return
			expects.push(s)
		}
	}
	
	IParse.prototype.reportExpecting = function()
	{
	 	var left = buffer.length - expect_pos
	 	var s = expect_line_column + " at: " + (left < 10 ? buffer.substr(expect_pos, left) + "<eof>" : buffer.substr(expect_pos, 10)).replaceAll("\n", "\\n")
	 	for (var i = 0; i < expects.length; i++)
	 		s += "\n  " + expects[i]
		return s
	}
	
	function next()
	{
		pos += 1
		if (pos >= buffer.length)
		{
			ch = 0
		}
		else
		{
			if (ch == 10)
			{
				line += 1
				column = 0
			}
			ch = buffer.charCodeAt(pos)
			column += 1
		}
	} 
	
	function skip_space()
	{
		for (;;)
		{
			if (ch == 32 || ch == 9 || ch == 10 || ch == 13)
				next()
			else if (ch == 47 && pos+1 < buffer.length && buffer.charCodeAt(pos+1) == 47)
			{
				while (ch != 0 && ch != 10 && ch != 13)
					next();
			}
			else if (ch == 47 && pos+1 < buffer.length && buffer.charCodeAt(pos+1) == 42)
			{
				next()
				next()
				while (ch != 0 && !(ch == 42 && pos+1 < buffer.length && buffer.charCodeAt(pos+1) == 47))
					next()
				if (ch == 42)
				{
					next()
					next()
				}
			}
			else
				break
		}
	}
	
	var cache
	
	function accept_string(quote)
	{
		if (cache[0].pos == pos)
		{
			if (cache[0].success)
			{
				restore_pos(cache[0].endsp)
				return cache[0].result
			}
			else
				return undefined
		}
		if (ch != quote)
		{
			expecting("<string>")
			return undefined
		}
		cache[0].pos = pos
		var sp = save_pos()
		next()
		var str = ""
		while (ch != 0 && ch != quote && ch != 13)
		{
			if (ch == 92)
			{
				str += buffer[pos]
				next()
				if (ch == 0)
					break
			}
			str += buffer[pos]
			next()
		}
		if (ch != quote)
		{
			restore_pos(sp)
			cache[0].success = false
			expecting("<string> (not terminated)")
			return undefined
		}
		next()
		skip_space()
		cache[0].success = true
		cache[0].endsp = save_pos()
		cache[0].result = str
		return str
	}
	
	function accept_id()
	{
		if (ident_start_char(ch))
		{
			if (cache[1].pos == pos)
			{
				restore_pos(cache[1].endsp)
				return cache[1].result
			}
			cache[1].pos = pos
			var id = buffer[pos]
			next()
			while (ident_start_char(ch) || (48 <= ch && ch <= 57))
			{
				id += buffer[pos]
				next()
			}
			skip_space()
			cache[1].endsp = save_pos()
			cache[1].result = id
			return id
		}
		return undefined
	}
	
	function accept_ident(grammar)
	{
		var sp = save_pos()
		var id = accept_id()
		if (id != undefined && !grammar.has_keyword(id))
			return id
		restore_pos(sp)
		expecting("<ident>")
		return undefined
	}
	
	function accept_int()
	{
		var sp = save_pos()
		var str = ""
		if (ch == 45)
		{
			str = "-"
			next()
		}
		if (48 <= ch && ch <= 57)
		{
			while (48 <= ch && ch <= 57)
			{
				str += buffer[pos]
				next()
			}
			skip_space()
			return parseInt(str)
		}
		restore_pos(sp)
		expecting("<int>")
		return undefined
	}
	
	function accept_roman()
	{
		var sp = save_pos()
		var id = accept_id()
		if (id == undefined)
		{
			restore_pos(sp)
			expecting("<roman_numeral>")
			return undefined
		}
		var prev = 0
		var result = 0
		for (var i = 0; i < id.length; i++)
		{
			var cur = id[i]
			if (cur == 'I') cur = 1
			else if (cur == 'V') cur = 5
			else if (cur == 'X') cur = 10
			else if (cur == 'L') cur = 50
			else if (cur == 'C') cur = 100
			else if (cur == 'D') cur = 500
			else if (cur == 'M') cur = 1000
			else
			{
				restore_pos(sp)
				expecting("<roman_numeral>")
				return undefined
			}
			if (prev < cur)
				result -= 2 * prev
			prev = cur
			result += cur
		}
		return result
	}
	
	function accept_lit(s, grammar)
	{
		if (ident_start_char(s.charCodeAt(0)))
		{
			var sp = save_pos()
			var id = accept_id()
			if (id != undefined && id === s)
				return true
			restore_pos(sp)
			expecting(s + " (keyword)")
//			return false
		}
		if (pos + s.length <= buffer.length && buffer.substr(pos, s.length) === s)
		{
			for (var i = 0; i < s.length; i++)
				next()
			skip_space()
			return true;
		}
		expecting(s)
		return false
	}
	
	function parse_term(term, rtree, grammar)
	{
		if (term == "int")
		{
			var i = accept_int()
			if (i == undefined)
				return false
			rtree.result = int_tree(i)
			return true
		}
		if (term == "ident")
		{
			var i = accept_ident(grammar)
			if (i == undefined)
				return false
			rtree.result = ident_tree(i)
			return true
		}
		if (term == "string")
		{
			var s = accept_string(34)
			if (s == undefined)
				return false
			rtree.result = string_tree(s)
			return true
		}
		if (term == "char")
		{
			var s = accept_string(39)
			if (s == undefined)
				return false
			rtree.result = char_tree(s)
			return true
		}
		if (term == "roman_numeral")
		{
			var i = accept_roman()
			if (i == undefined)
				return false
			rtree.result = int_tree(i)
			return true;
		}
		if (term == "eof")
		{
			return ch == 0
		}
		return false
	}
	
	function parse_nt(non_term, rtree, grammar)
	{
		var c = cache[non_term.nr]
		if (c.pos == pos)
		{
			if (c.success)
			{
				rtree.result = c.result
				restore_pos(c.endsp)
				return true
			}
			return false
		}
		var start_pos = pos
		c.pos = start_pos
		c.success = false
		for (var i = 0; i < non_term.normal.length; i++)
			if (parse_rule(non_term.normal[i].rule, undefined, non_term.normal[i].tree_name, rtree, grammar))
			{
				if (non_term.recursive.length > 0)
				{
					for (;;)
					{
						var i = 0
						for (; i < non_term.recursive.length; i++)
							if (parse_rule(non_term.recursive[i].rule, { last:rtree.result }, non_term.recursive[i].tree_name, rtree, grammar))
								break;
						if (i == non_term.recursive.length)
							break;
					}
				}
				
				c.pos = start_pos
				c.success = true
				c.endsp = save_pos()
				c.result = rtree.result
				return true
			}
		//expecting("non terminal: "+non_term.name)
		return false
	}
	
	function parse_or(or, rtree, grammar)
	{
		for (var i = 0; i < or.length; i++)
			if (parse_rule(or[i].rule, undefined, or[i].tree_name, rtree, grammar))
				return true
		return false
	}
	
	function parse_rule(rule, prev_parts, tree_name, rtree, grammar)
	{
		if (rule == undefined)
		{
			if (tree_name != undefined)
			{
				rtree.result = tree_tree(tree_name)
				for (var parts = prev_parts; parts != null; parts = parts.prev)
					rtree.result.children.unshift(parts.last)
			}
			else if (prev_parts != undefined)
			{
				if (prev_parts.prev == undefined)
					rtree.result = prev_parts.last
				else
				{
					rtree.result = list_tree()
					for (var parts = prev_parts; parts != null; parts = parts.prev)
						rtree.result.children.unshift(parts.last)
				}
			}
			return true
		}
		
		var sp = save_pos()
		
		var go = false
		var t = { result:undefined }
		if (rule.kind == RK_TERM)
			go = parse_term(rule.value, t, grammar)
		else if (rule.kind == RK_NT)
			go = parse_nt(rule.value, t, grammar)
		else if (rule.kind == RK_LIT)
		{
			if (accept_lit(rule.value, grammar))
			{
				if (rule.sequential)
				{
					var seq = list_tree()
					
					if (parse_seq(rule, seq, prev_parts, tree_name, rtree, grammar))
						return true
				}
				else if (parse_rule(rule.next, prev_parts, tree_name, rtree, grammar))
					return true
			}
			else if (rule.optional)
			{
				if (parse_rule(rule.next, prev_parts, tree_name, rtree, grammar))
					return true
			}
			restore_pos(sp)
			return false
		}
		else if (rule.kind == RK_GROUP)
			go = parse_or(rule.value, t, grammar)
		
		if (go)
		{
			if (rule.sequential)
			{
				var seq = list_tree()
				seq.children.push(t.result)
				
				if (parse_seq(rule, seq, prev_parts, tree_name, rtree, grammar))
					return true
			}
			else if (parse_rule(rule.next, { prev:prev_parts, last:t.result }, tree_name, rtree, grammar))
				return true
		}
		
		if (rule.optional)
		{
			restore_pos(sp)
			
			if (parse_rule(rule.next, { prev:prev_parts, last:undefined }, tree_name, rtree, grammar))
				return true
		}
		restore_pos(sp)
		return false
	}
	
	function parse_seq(rule, seq, prev_parts, tree_name, rtree, grammar)
	{
		var sp = save_pos()
		
		if (rule.chain_sym == undefined || accept_lit(rule.chain_sym, grammar))
		{
			var go = false
			var t = { result:undefined }
			if (rule.kind == RK_TERM)
				go = parse_term(rule.value, t, grammar)
			else if (rule.kind == RK_NT)
				go = parse_nt(rule.value, t, grammar)
			else if (rule.kind == RK_GROUP)
				go = parse_or(rule.value, t, grammar)
			
			if (go)
			{
				seq.children.push(t.result)
				if (parse_seq(rule, seq, prev_parts, tree_name, rtree, grammar))
					return true
				seq.children.pop()
			}
		}
		
		restore_pos(sp)
		
		if (parse_rule(rule.next, { prev:prev_parts, last:seq }, tree_name, rtree, grammar))
			return true
	
		restore_pos(sp)
	
		return false
	}
	
	var iparse_grammar = make_iparse_grammar()
	
	IParse.prototype.parse = function(s, g)
	{
		grammar = g
		buffer = s
		pos = 0
		line = 1
		column = 1
		expect_pos = -1
		expect_line_column = "?"
		expects = []
		ch = buffer.length == 0 ? 0 : buffer.charCodeAt(0)
		skip_space()
		cache = []
		for (var i = 0; i < grammar.non_terminals.length + 2; i++)
			cache.push({ pos:-1, success:false, endsp:undefined, result:undefined})
		rtree = { result:undefined }
		if (parse_nt(grammar.find_nt("root"), rtree, grammar) && ch == 0)
			return rtree.result
		return false
	}
	
	IParse.prototype.parseGrammar = function(s)
	{
		grammar = iparse_grammar
		buffer = s
		pos = 0
		line = 1
		column = 1
		expect_pos = -1
		expect_line_column = "?"
		expects = []
		ch = buffer.length == 0 ? 0 : buffer.charCodeAt(0)
		skip_space()
		cache = []
		for (var i = 0; i < grammar.non_terminals.length + 2; i++)
			cache.push({ pos:-1, success:false, endsp:undefined, result:undefined})
		rtree = { result:undefined }
		if (parse_nt(grammar.find_nt("root"), rtree, grammar) && ch == 0)
			return make_grammar(rtree.result)
		return false
	}
		
	return IParse;
}());
