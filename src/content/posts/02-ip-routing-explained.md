---
title: "IP 라우팅(IP Routing) 설명"
date: 2026-07-29
category: Routing
subcategory: "IP Routing"
excerpt: "라우터가 프레임 하나를 받아서 FCS 검사, 역캡슐화, 라우팅 테이블 조회, TTL 감소, 재캡슐화까지 마치는 전 과정을 단계별로 뜯어본다."
---

라우터가 실제로 IP 패킷을 전달하는 과정을 IP 라우팅(IP Routing)이라고 합니다. 이것은 스태틱 라우팅이나 다이나믹 라우팅 프로토콜을 통한 네트워크 경로의 "학습"과는 관련이 없으며, 라우터가 하나의 인터페이스에서 다른 인터페이스로 IP 패킷을 전달할 때 수행해야 하는 단계들과 관련이 있습니다.

이 강의에서는 예제를 통해 발생하는 모든 단계를 보여드리겠습니다.

이를 위해 다음 토폴로지(Topology)를 사용합니다:

![H1-R1-R2-H2 토폴로지, 각 장비의 IP·MAC 주소 표시](/images/ip-routing-explained/topology.png)

위에서 두 대의 호스트 컴퓨터와 두 대의 라우터가 있습니다. H1이 H2에게 IP 패킷을 보내려 하며, 이 패킷은 R1과 R2에 의해 라우팅되어야 합니다.

## IP 라우팅 프로세스

이 과정을 단계별로, 장치별로 살펴보겠습니다.

### H1

H1부터 시작하겠습니다. 이 호스트는 자신의 IP 주소(192.168.1.1)를 출발지로, H2(192.168.2.2)를 목적지로 하는 IP 패킷을 생성합니다. H1이 스스로에게 묻는 첫 번째 질문은 다음과 같습니다:

- *목적지가 로컬인가, 리모트인가?*

H1은 자신의 IP 주소, 서브넷 마스크(Subnet Mask), 목적지 IP 주소를 확인하여 이 질문에 답합니다:

```
C:\Users\H1>ipconfig
Windows IP Configuration

Ethernet adapter Ethernet 1:
   Connection-specific DNS Suffix . : nwl.local
   Link-local IPv6 Address . . . . . : fe80::88fd:962a:44d6:3a1f%4
   IPv4 Address. . . . . . . . . . . : 192.168.1.1
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
   Default Gateway . . . . . . . . . : 192.168.1.254
```

H1은 192.168.1.0/24 네트워크에 있으므로 192.168.1.1 ~ 254 범위의 모든 IP 주소가 로컬입니다. 목적지(192.168.2.2)는 로컬 서브넷 외부에 있으므로 기본 게이트웨이(Default Gateway)를 사용해야 합니다.

H1은 이제 이더넷 프레임(Ethernet Frame)을 구성하고, 자신의 출발지 MAC 주소를 입력한 다음 두 번째 질문을 합니다. 기본 게이트웨이의 목적지 MAC 주소를 알고 있는가?

ARP 테이블(ARP Table)을 확인하여 답을 찾습니다:

```
C:\Users\H1>arp -a

Interface: 192.168.1.1 --- 0x4
  Internet Address      Physical Address      Type
  192.168.1.254         fa-16-3e-3f-fd-3c     dynamic
  192.168.1.255         ff-ff-ff-ff-ff-ff     static
  224.0.0.22            01-00-5e-00-00-16     static
  224.0.0.251            01-00-5e-00-00-fb     static
  224.0.0.252            01-00-5e-00-00-fc     static
  239.255.255.250       01-00-5e-7f-ff-fa     static
```

H1은 192.168.1.254에 대한 ARP 항목을 가지고 있습니다. 만약 없었다면 ARP 요청(ARP Request)을 보냈을 것입니다. 이제 다음 주소들을 가진 IP 패킷을 운반하는 이더넷 프레임이 만들어졌습니다:

![H1이 만든 이더넷 프레임의 출발지·목적지 MAC/IP 주소](/images/ip-routing-explained/frame-h1-to-r1.png)

프레임은 R1을 향해 전송됩니다.

### R1

이 이더넷 프레임이 R1에 도착합니다. R1은 호스트보다 더 많은 작업을 수행해야 합니다. 가장 먼저 하는 일은 이더넷 프레임의 FCS(Frame Check Sequence)가 올바른지 확인하는 것입니다:

> FCS: 이더넷 프레임 끝에 붙는 4바이트 오류 검출 필드. 송신 측이 프레임 내용(Destination MAC ~ Data)을 기반으로 CRC-32 값을 계산해서 프레임 끝에 붙임

![이더넷 프레임 구조와 끝단의 FCS 필드](/images/ip-routing-explained/ethernet-frame-fcs.png)

FCS가 올바르지 않으면 프레임은 즉시 폐기됩니다. 이더넷에는 오류 복구 기능이 없으며, 이는 전송 계층(Transport Layer)의 TCP와 같은 상위 계층 프로토콜에서 처리합니다.

FCS가 올바르면 다음 조건에 해당하는 경우 프레임을 처리합니다:

- 목적지 MAC 주소가 라우터 인터페이스의 주소인 경우.
- 목적지 MAC 주소가 라우터 인터페이스가 연결된 서브넷의 브로드캐스트(Broadcast) 주소인 경우.
- 목적지 MAC 주소가 라우터가 수신하는 멀티캐스트(Multicast) 주소인 경우.

이 경우 목적지 MAC 주소가 R1의 GigabitEthernet 0/1 인터페이스의 MAC 주소와 일치하므로 처리합니다. 이더넷 프레임에서 IP 패킷을 역캡슐화(De-encapsulate)하여 추출하고, 프레임은 폐기됩니다:

![이더넷 프레임에서 IP 패킷만 역캡슐화로 추출되는 모습](/images/ip-routing-explained/ip-packet-extract.png)

라우터는 이제 IP 패킷을 살펴보며, 가장 먼저 하는 일은 헤더 체크섬(Header Checksum)이 올바른지 확인하는 것입니다:

![IP 헤더 구조와 Header Checksum 필드](/images/ip-routing-explained/ip-header-checksum.png)

헤더 체크섬이 올바르지 않으면 IP 패킷은 즉시 폐기됩니다. 네트워크 계층에서도 오류 복구 기능이 없으며, 상위 계층에 의존합니다. 헤더 체크섬이 올바르면 목적지 IP 주소를 확인합니다:

![IP 헤더의 Destination 필드 확인](/images/ip-routing-explained/ip-header-destination.png)

R1은 이제 라우팅 테이블(Routing Table)을 확인하여 일치하는 항목이 있는지 확인합니다:

```
R1#show ip route
Codes: L - local, C - connected, S - static, R - RIP, M - mobile, B - BGP
       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area
       N1 - OSPF NSSA external type 1, N2 - OSPF NSSA external type 2
       E1 - OSPF external type 1, E2 - OSPF external type 2
       i - IS-IS, su - IS-IS summary, L1 - IS-IS level-1, L2 - IS-IS level-2
       ia - IS-IS inter area, * - candidate default, U - per-user static route
       o - ODR, P - periodic downloaded static route, H - NHRP, l - LISP
       a - application route
       + - replicated route, % - next hop override, p - overrides from PfR

Gateway of last resort is not set

      192.168.1.0/24 is variably subnetted, 2 subnets, 2 masks
C        192.168.1.0/24 is directly connected, GigabitEthernet0/1
L        192.168.1.254/32 is directly connected, GigabitEthernet0/1
S     192.168.2.0/24 [1/0] via 192.168.12.2
      192.168.12.0/24 is variably subnetted, 2 subnets, 2 masks
C        192.168.12.0/24 is directly connected, GigabitEthernet0/2
L        192.168.12.1/32 is directly connected, GigabitEthernet0/2
```

위에서 R1이 192.168.2.0/24 네트워크에 도달하는 방법을 알고 있으며, 넥스트 홉(Next Hop) IP 주소가 192.168.12.2인 것을 볼 수 있습니다. 이제 192.168.12.2에 도달하는 방법을 알고 있는지 확인하기 위해 두 번째 라우팅 테이블 조회를 수행하는데, 이것을 **재귀 라우팅(Recursive Routing)** 이라고 합니다. 보시다시피 192.168.12.0/24에 대한 항목이 있으며 사용할 인터페이스는 GigabitEthernet 0/2입니다.

> 기본적으로 Cisco IOS 라우터는 라우팅 테이블을 구축합니다. 이 기능을 비활성화하여 라우터를 일반 호스트로 전환하는 것도 가능합니다.

IP 패킷을 전달하기 전에 한 가지 더 해야 할 일이 있습니다. 라우팅을 하고 있으므로 TTL(Time to Live) 필드를 1 감소시켜야 합니다. R1은 이 작업을 수행하며, IP 헤더가 변경되므로 새로운 헤더 체크섬을 계산해야 합니다.

![R1이 TTL을 255에서 254로 감소시킨 IP 헤더](/images/ip-routing-explained/ip-header-ttl-decremented.png)

이 작업이 완료되면 R1은 ARP 테이블을 확인하여 192.168.12.2에 대한 항목이 있는지 확인합니다:

```
R1#show ip arp
Protocol  Address          Age (min)  Hardware Addr   Type   Interface
Internet  192.168.1.1            58   fa16.3e87.9c2a  ARPA   GigabitEthernet0/1
Internet  192.168.1.254           -   fa16.3e3f.fd3c  ARPA   GigabitEthernet0/1
Internet  192.168.12.1            -   fa16.3e02.83a1  ARPA   GigabitEthernet0/2
Internet  192.168.12.2           95   fa16.3e01.0c98  ARPA   GigabitEthernet0/2
```

문제없습니다. ARP 테이블에 항목이 있습니다. 만약 없었다면 R1은 192.168.12.2의 MAC 주소를 찾기 위해 ARP 요청을 보냈을 것입니다. R1은 GigabitEthernet 0/2 인터페이스의 자체 MAC 주소를 출발지로, R2를 목적지로 하는 새로운 이더넷 프레임을 구성합니다. IP 패킷은 이 새로운 이더넷 프레임에 캡슐화(Encapsulate)됩니다.

![R1이 R2로 보내는 새 이더넷 프레임의 출발지·목적지 주소](/images/ip-routing-explained/frame-r1-to-r2.png)

프레임은 R2를 향해 전송됩니다.

### R2

이 이더넷 프레임이 R2에 도착합니다. R1과 마찬가지로 먼저 다음을 수행합니다:

- 이더넷 프레임의 FCS를 확인합니다.
- IP 패킷을 역캡슐화하고 프레임을 폐기합니다.
- IP 헤더 체크섬을 확인합니다.
- 목적지 IP 주소를 확인합니다.

라우팅 테이블에서 다음을 찾습니다:

```
R2#show ip route
Codes: L - local, C - connected, S - static, R - RIP, M - mobile, B - BGP
       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area
       N1 - OSPF NSSA external type 1, N2 - OSPF NSSA external type 2
       E1 - OSPF external type 1, E2 - OSPF external type 2
       i - IS-IS, su - IS-IS summary, L1 - IS-IS level-1, L2 - IS-IS level-2
       ia - IS-IS inter area, * - candidate default, U - per-user static route
       o - ODR, P - periodic downloaded static route, H - NHRP, l - LISP
       a - application route
       + - replicated route, % - next hop override, p - overrides from PfR

Gateway of last resort is not set

S     192.168.1.0/24 [1/0] via 192.168.12.1
      192.168.2.0/24 is variably subnetted, 2 subnets, 2 masks
C        192.168.2.0/24 is directly connected, GigabitEthernet0/1
L        192.168.2.254/32 is directly connected, GigabitEthernet0/1
      192.168.12.0/24 is variably subnetted, 2 subnets, 2 masks
C        192.168.12.0/24 is directly connected, GigabitEthernet0/2
L        192.168.12.2/32 is directly connected, GigabitEthernet0/2
```

192.168.2.0/24 네트워크는 R2의 GigabitEthernet 0/1 인터페이스에 직접 연결되어 있습니다. R2는 이제 IP 패킷의 TTL을 254에서 253으로 줄이고, IP 헤더 체크섬을 다시 계산하고, ARP 테이블을 확인하여 192.168.2.2에 도달하는 방법을 알고 있는지 확인합니다:

```
R2#show ip arp
Protocol  Address          Age (min)  Hardware Addr   Type   Interface
Internet  192.168.2.2           121   fa16.3e4a.f598  ARPA   GigabitEthernet0/1
Internet  192.168.2.254           -   fa16.3e3c.7da4  ARPA   GigabitEthernet0/1
Internet  192.168.12.1          111   fa16.3e02.83a1  ARPA   GigabitEthernet0/2
Internet  192.168.12.2            -   fa16.3e01.0c98  ARPA   GigabitEthernet0/2
```

ARP 항목이 있습니다. 새로운 이더넷 프레임이 생성되고, IP 패킷이 캡슐화되며 다음 주소들을 가집니다:

![R2가 H2로 보내는 새 이더넷 프레임의 출발지·목적지 주소](/images/ip-routing-explained/frame-r2-to-h2.png)

프레임은 H2로 전달됩니다.

### H2

H2가 이더넷 프레임을 수신하면 다음을 수행합니다:

- FCS를 확인합니다.
- 목적지 MAC 주소로 자신의 MAC 주소를 찾습니다.
- 프레임에서 IP 패킷을 역캡슐화합니다.
- IP 패킷에서 목적지로 자신의 IP 주소를 찾습니다.

그런 다음 H2는 프로토콜(Protocol) 필드를 확인하여 어떤 전송 계층 프로토콜을 사용하고 있는지 파악하며, 이후 동작은 사용되는 전송 계층 프로토콜에 따라 달라집니다.

## 결론

이제 IP 패킷이 하나의 라우터에서 다른 라우터로 전달되는 과정, 즉 IP 라우팅에 대해 배웠습니다.

이 과정을 요약하겠습니다.

호스트는 간단한 결정을 내려야 합니다:

- 목적지가 로컬 서브넷에 있는가? 그렇다면:
  - ARP 테이블을 확인하여 목적지 IP 주소가 테이블에 있는지 확인하고, 있다면 해당 MAC 주소를 이더넷 프레임의 목적지 필드에 사용합니다.
- 목적지가 리모트 서브넷에 있는가? 그렇다면:
  - ARP 테이블을 확인하여 **기본 게이트웨이의 IP 주소가 테이블에 있는지** 확인하고, 있다면 해당 MAC 주소를 이더넷 프레임의 목적지 필드에 사용합니다.

라우터는 여러 작업을 수행해야 합니다:

- 이더넷 프레임을 수신하면 FCS(Frame Check Sequence)가 올바른지 확인합니다. 올바르지 않으면 프레임을 폐기합니다.
- 프레임의 목적지 주소가 다음에 해당하는지 확인합니다:
  - 우리의 MAC 주소로 지정된 경우
  - 인터페이스가 속한 서브넷의 브로드캐스트 주소로 지정된 경우
  - 우리가 수신하는 멀티캐스트 주소로 지정된 경우
- 프레임에서 IP 패킷을 역캡슐화하고 이더넷 프레임을 폐기합니다.
- 목적지 IP 주소에 대해 라우팅 테이블에서 일치하는 항목을 찾고, 송신 인터페이스와 선택적으로 넥스트 홉 IP 주소를 결정합니다.
- IP 헤더의 TTL(Time to Live) 필드를 감소시키고 헤더 체크섬을 다시 계산합니다.
- IP 패킷을 새로운 이더넷 프레임에 캡슐화합니다.
- 목적지 IP 주소 또는 넥스트 홉 IP 주소에 대해 ARP 테이블을 확인합니다.
- 프레임을 전송합니다.
