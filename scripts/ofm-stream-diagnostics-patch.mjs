// PR #5's remaining gap: the normal completion branches already emit errors
// in 2.5.4, but the final HTTP safety net still silently closes started streams.
export function patchStreamDiagnostics(source) {
  const before = `      } else {
        res.end()
      }
    })
  })`;
  const after = `      } else if (!res.writableEnded && !res.destroyed) {
        const message = String(error?.message ?? error)
        const type = String(res.getHeader('content-type') ?? '')
        if (type.includes('text/event-stream')) {
          const pathname = new URL(req.url ?? '/', 'http://localhost').pathname.replace(/\\/+$/, '')
          if (pathname.endsWith('/messages')) res.write('event: error\\ndata: ' + JSON.stringify({ type: 'error', error: { type: 'api_error', message } }) + '\\n\\n')
          else if (pathname.endsWith('/responses')) res.write('event: error\\ndata: ' + JSON.stringify({ type: 'error', code: 'server_error', message }) + '\\n\\n')
          else { res.write('data: ' + JSON.stringify({ error: { type: 'server_error', message } }) + '\\n\\n'); res.write('data: [DONE]\\n\\n') }
        }
        res.end()
      }
    })
  })`;
  if (source.split(before).length !== 2) throw new Error('Upstream forward safety-net handling changed');
  source = source.replace(before, after);
  const headers = 'function openStreamHeaders(res, heartbeatMs = SSE_HEARTBEAT_MS) {';
  if (source.split(headers).length !== 2) throw new Error('Upstream SSE header initialization changed');
  // writeHead({...}) alone need not populate getHeader() on an untraced route.
  return source.replace(headers, headers + "\n  res.setHeader('content-type', 'text/event-stream; charset=utf-8')");
}
