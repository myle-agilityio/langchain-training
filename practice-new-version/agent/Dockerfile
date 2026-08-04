FROM langchain/langgraphjs-api:rc-node20-wolfi
ADD . /deps/agent
ENV LANGSERVE_GRAPHS='{"sample_agent":"./src/graphs/index.ts:graph"}'
WORKDIR /deps/agent
RUN npm ci
RUN (test ! -f /api/langgraph_api/js/build.mts && echo "Prebuild script not found, skipping") || tsx /api/langgraph_api/js/build.mts