
start
  = parts: section * {
    return parts.filter(p => p.start)
  }

section
  = embedded / everything

embedded
  = type: type tag: tag ? lang : ConnectOrPythonOrHandle ? end : arguments {
  const loc = location()
  return {
    type,
    tag,
    ...(type.toLowerCase().includes("continue") ? { handle: lang } : { lang }),
    start: loc.start.line,
    end
  }
}

type
  = ("continueEmbeddedCode"i / "onEmbeddedCode"i / "embeddedCode"i)

ConnectOrPythonOrHandle
  = _ connectOrPython: ([a - zA - Z\(\)] +) _ {
  return connectOrPython.join("")
}

tag
  = "." tagname: ([a - zA - Z] +) _ {
  return tagname.join("")
}

_ = [\t\r\n] *

  arguments
    = everything end {
  const loc = location();
  return loc.end.line;
}

end = ("onEmbeddedCode"i / "embeddedCode"i / "endEmbeddedCode"i / "offEmbeddedCode"i / "continueEmbeddedCode"i / "pauseEmbeddedCode"i)

everything = ((!end).) +