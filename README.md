```sh
Last login: Fri Oct  6 03:39:18 2023 from 104.231.225.84
root@evanbecker-droplet:~# mkdir /etc/traefik
root@evanbecker-droplet:~# vim /etc/traefik/traefik.yaml
root@evanbecker-droplet:~# cat /etc/traefik/traefik.yaml
tls:
  certificates:
    - certFile: /certs/evanbecker.net.crt
      keyFile: /certs/evanbecker.net.key
  stores:
    default:
      defaultCertificate:
        certFile: /certs/evanbecker.net.crt
        keyFile: /certs/evanbecker.net.key
```