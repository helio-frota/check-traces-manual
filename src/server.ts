import opentelemetry from '@opentelemetry/api';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import {
  BasicTracerProvider,
  ConsoleSpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';

import { error, log } from 'console';

import express, { Express, Request, Response } from 'express';

const exporter = new OTLPTraceExporter();

const provider = new BasicTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: process.env.npm_package_name,
  }),
});

provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
provider.register();

const tracer = opentelemetry.trace.getTracer(
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  process.env.npm_package_name!,
  process.env.npm_package_version
);

const app: Express = express();
const port = 8080;

const parentSpan = tracer.startSpan('main');

app.get('/', (_: Request, res: Response) => {
  const ctx = opentelemetry.trace.setSpan(
    opentelemetry.context.active(),
    parentSpan
  );
  const span = tracer.startSpan('GET /', undefined, ctx);
  span.addEvent('invoking GET/');
  res.send('Hello World!');
  span.end();
});

const server = app.listen(port, () => {
  log(`Example app listening on port ${port}`);
});

function shutDown() {
  parentSpan.end();
  exporter.shutdown().catch(error);
  server.close(() => process.exit(0));
}

process.on('SIGTERM', shutDown);
process.on('SIGINT', shutDown);
