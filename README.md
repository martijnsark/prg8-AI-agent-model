# prg8-AI-agent-model

## GitHub repository

`https://github.com/martijnsark/prg8-AI-agent-model`

## Installation instructions

1. Clone the repository:
	```bash
	git clone https://github.com/martijnsark/prg8-AI-agent-model.git
	cd prg8-AI-agent-model
	```
2. Install dependencies:
	```bash
	npm install
	```
3. Create a `.env` file in the project root and add:
	```env
	AZURE_OPENAI_API_VERSION=
	AZURE_OPENAI_API_INSTANCE_NAME=
	AZURE_OPENAI_API_KEY=
	AZURE_OPENAI_API_DEPLOYMENT_NAME=
	AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME=
	OpenWeatherMap_API_key=
	SMTP_HOST=smtp.gmail.com
	SMTP_PORT=587
	```
4. Save/update the vectorstore database:
	```bash
	npm run save
	```
	This command runs `save.js` and stores processed data in `documents/docstore.json` and `documents/faiss.index`.
5. Run the test command:
	```bash
	npm test
	```
	This command runs `agent.js` with your `.env` configuration.
6. Start the server:
	```bash
	npm run start 
	```
    This command runs `server.js` with your `.env` configuration.
7. Open the application in your browser at:
	```
	http://localhost:3000
	```

## Edge cases

1. `pdf-parse` dependency version conflict:
	Some dependency combinations may require `pdf-parse` 2.x to install other packages. If that happens, install the newer version first, install the other package(s), and then switch back to v1 for PDF reading compatibility in this project.
	```bash
	npm install pdf-parse@2
	# install the other package(s) you need
	npm install pdf-parse@1 --legacy-peer-deps
	```