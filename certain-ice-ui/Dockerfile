FROM node:18

ENV DEBIAN_FRONTEND noninteractive
ENV USER=node
ENV NODE_ENV docker

# You can not use `${USER}` here, but reference `/home/node`.
ENV PATH="/home/node/.npm-global/bin:${PATH}"
# 👉 The `--global` install dir
ENV NPM_CONFIG_PREFIX="/home/node/.npm-global"

EXPOSE 4201

USER "${USER}"

# Pre-create the target dir for global install.
RUN mkdir -p "${NPM_CONFIG_PREFIX}/lib"

WORKDIR /certain-ice-ui

# Install global packages
# RUN npm --global config set user "${USER}"

# Copy in resources
COPY --chown="${USER}":root . .

RUN npm install

RUN npm install -g @angular/cli

# Launch - install on launch so that node_modules are updated in volume
CMD /bin/bash -c 'npm install; npm start'
