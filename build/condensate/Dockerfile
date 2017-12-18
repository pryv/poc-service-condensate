FROM pryv/base:1.2.13
MAINTAINER "Tech@Pryv" <tech@pryv.com>

RUN echo '### Dockerfile starts ###'

ADD . /pd_build
RUN /pd_build/install.sh

# Ports:
#   9000        condensate api
#
EXPOSE 9000

