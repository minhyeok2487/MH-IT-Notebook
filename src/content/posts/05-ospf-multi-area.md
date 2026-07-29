---
title: "OSPF Multi-Area 설정 (OSPF Multi-Area Configuration)"
date: 2026-07-23
category: Routing
subcategory: "OSPF"
excerpt: "R1·R2가 ABR이 되고, R3·R4의 루프백이 영역을 두 번 건너 O IA 경로로 도착하기까지 — 멀티 에어리어 OSPF를 실제 검증 출력으로 추적한다."
---

[OSPF 개요](/posts/03-ospf-overview/)에서 왜 여러 영역(Area)을 사용하는지 설명했고, [OSPF 기본 설정](/posts/04-ospf-basic-config/)에서는 싱글 에어리어 설정 방법을 다뤘습니다. 이번에는 **멀티 에어리어 OSPF**를 설정하는 방법을 살펴봅니다.

사용할 토폴로지는 다음과 같습니다:

![R1·R2가 Area 0의 ABR, R3는 Area 1, R4는 Area 2에 있는 토폴로지](/images/ospf-multi-area/topology.png)

R1과 R2는 백본 영역인 **Area 0**에 있습니다. R1과 R3 사이는 **Area 1**, R2와 R4 사이는 **Area 2**를 사용합니다. R3과 R4에는 루프백 인터페이스가 있고, 각자의 영역에 광고합니다.

- R1: Gi0/1(.1) → 192.168.12.0/24(Area 0), Gi0/2(.1) → 192.168.13.0/24(Area 1)
- R2: Gi0/1(.2) → 192.168.12.0/24(Area 0), Gi0/2(.2) → 192.168.24.0/24(Area 2)
- R3: Gi0/1(.3) → 192.168.13.0/24(Area 1), Lo0 → 3.3.3.3/32(Area 1)
- R4: Gi0/1(.4) → 192.168.24.0/24(Area 2), Lo0 → 4.4.4.4/32(Area 2)

## 1. 핵심 요약

- **멀티 에어리어 OSPF는 `network` 문의 area 번호만 다르게 지정**하면 됩니다. 프로세스 자체는 싱글 에어리어와 동일하게 `router ospf 1`로 시작합니다.
- **R1과 R2는 두 영역에 동시에 소속**됩니다(Area 0 + Area 1, Area 0 + Area 2). 이렇게 두 영역 경계에 걸친 라우터가 **ABR(Area Border Router)** 입니다.
- **R3, R4는 Area 0을 거치지 않고는 서로 도달할 수 없습니다.** 모든 영역 간 트래픽은 반드시 백본(Area 0)을 통과합니다.
- 라우팅 테이블에서 같은 영역 내 경로는 **O**(intra-area), 다른 영역에서 온 경로는 **O IA**(inter-area)로 표시됩니다.
- `show ip ospf neighbor`는 area 정보를 보여주지 않습니다. area까지 확인하려면 `show ip ospf neighbor detail` 또는 `show ip protocols`를 씁니다.

## 2. 사전 지식

이 실습을 따라 하려면 [OSPF 기본 설정](/posts/04-ospf-basic-config/)에서 다룬 Router ID, network 와일드카드 마스크, Cost 개념을 먼저 이해하고 있어야 합니다.

> 아래 예제의 인터페이스는 모두 **GigabitEthernet**입니다. 참조 대역폭 기본값이 100Mbit이므로 Gigabit 인터페이스의 Cost는 전부 `100 ÷ 1000 = 0.1 → 최솟값 1`로 계산됩니다. 뒤에 나오는 메트릭이 전부 홉 수와 정확히 일치하는 이유가 이것입니다. Ethernet(10Mbit)이었던 싱글 에어리어 실습([OSPF 기본 설정](/posts/04-ospf-basic-config/))의 Cost 10과 헷갈리지 마세요.

## 3. 설정

OSPF를 올리는 데 필요한 network 문을 전부 넣어보겠습니다. `network` 문은 각 인터페이스가 어느 영역에 속하는지 정의합니다.

### 3.1. 백본 영역(Area 0) — R1, R2

```
R1(config)#router ospf 1
R1(config-router)#network 192.168.12.0 0.0.0.255 area 0

R2(config)#router ospf 1
R2(config-router)#network 192.168.12.0 0.0.0.255 area 0
```

### 3.2. Area 1 — R1, R3

```
R1(config)#router ospf 1
R1(config-router)#network 192.168.13.0 0.0.0.255 area 1

R3(config)#router ospf 1
R3(config-router)#network 192.168.13.0 0.0.0.255 area 1
R3(config-router)#network 3.3.3.3 0.0.0.0 area 1
```

### 3.3. Area 2 — R2, R4

```
R2(config)#router ospf 1
R2(config-router)#network 192.168.24.0 0.0.0.255 area 2

R4(config)#router ospf 1
R4(config-router)#network 192.168.24.0 0.0.0.255 area 2
R4(config-router)#network 4.4.4.4 0.0.0.0 area 2
```

필요한 network 문은 이게 전부입니다.

> **주의**: R1과 R2에 area 0용 network 문을 먼저 넣지 않고 area 1/area 2용 network 문부터 넣으면, 인터페이스에 IP는 있어도 OSPF 프로세스가 router-id를 할당하지 못해 `%OSPF-4-NORTRID: OSPF process 1 failed to allocate unique router-id and cannot start` 오류가 날 수 있습니다. 인터페이스가 `no shutdown` 상태인지부터 `show ip interface brief`로 확인하세요.

## 4. 검증

먼저 OSPF 네이버가 정상적으로 맺혔는지 확인합니다:

```
R1#show ip ospf neighbor

Neighbor ID     Pri   State           Dead Time   Address         Interface
192.168.24.2      1   FULL/DR         00:00:36    192.168.12.2    GigabitEthernet0/1
3.3.3.3           1   FULL/BDR        00:00:34    192.168.13.3    GigabitEthernet0/2
```

R1은 R2, R3과 네이버를 맺었습니다. 여기서 첫 번째 줄의 **Neighbor ID가 `192.168.24.2`인 것을 주목하세요.** R2에는 router-id를 수동으로 지정하지 않았기 때문에, R2가 가진 인터페이스 IP 중 **가장 높은 값**(Gi0/2의 192.168.24.2)이 자동으로 router-id가 된 것입니다. 반면 Address 칸의 `192.168.12.2`는 R1-R2 링크에서 실제로 쓰이는 R2의 IP입니다. **Neighbor ID(router-id)와 Address(그 링크의 실제 IP)는 이렇게 서로 다를 수 있습니다.**

R2도 확인해 보겠습니다:

```
R2#show ip ospf neighbor

Neighbor ID     Pri   State           Dead Time   Address         Interface
192.168.13.1      1   FULL/BDR        00:00:34    192.168.12.1    GigabitEthernet0/1
4.4.4.4           1   FULL/BDR        00:00:30    192.168.24.4    GigabitEthernet0/2
```

`show ip ospf neighbor` 명령어는 area 정보를 보여주지 않습니다. area까지 보려면 `detail` 파라미터를 추가합니다:

```
R2#show ip ospf neighbor detail
 Neighbor 192.168.13.1, interface address 192.168.12.1
    In the area 0 via interface GigabitEthernet0/1
    Neighbor priority is 1, State is FULL, 6 state changes
    DR is 192.168.12.2 BDR is 192.168.12.1
    ...

 Neighbor 4.4.4.4, interface address 192.168.24.4
    In the area 2 via interface GigabitEthernet0/2
    Neighbor priority is 1, State is FULL, 6 state changes
    DR is 192.168.24.2 BDR is 192.168.24.4
    ...
```

`interface address 192.168.12.1`이 바로 실제 링크 주소이며, 요약 표의 Address 칸도 원래 이 값과 같아야 정상입니다. GigabitEthernet0/1은 area 0, GigabitEthernet0/2는 area 2에 속한 것도 함께 확인됩니다.

area 정보를 확인하는 또 다른 방법은 `show ip protocols`입니다:

```
R2#show ip protocols
Routing Protocol is "ospf 1"
  Outgoing update filter list for all interfaces is not set
  Incoming update filter list for all interfaces is not set
  Router ID 192.168.24.2
  It is an area border router
  Number of areas in this router is 2. 2 normal 0 stub 0 nssa
  Maximum path: 4
  Routing for Networks:
    192.168.12.0 0.0.0.255 area 0
    192.168.24.0 0.0.0.255 area 2
  Routing Information Sources:
    Gateway         Distance      Last Update
    4.4.4.4              110      00:16:04
    192.168.13.1          110      00:16:53
  Distance: (default is 110)
```

`Router ID 192.168.24.2`와 `It is an area border router` 줄에서, R2가 router-id를 자동 선택했다는 사실과 **ABR**이라는 사실을 바로 확인할 수 있습니다. `Routing for Networks` 아래에는 어떤 네트워크가 어떤 영역에 속하는지 나옵니다.

### 라우팅 테이블

```
R1#show ip route ospf
      3.0.0.0/32 is subnetted, 1 subnets
O        3.3.3.3 [110/2] via 192.168.13.3, 00:01:47, GigabitEthernet0/2
      4.0.0.0/32 is subnetted, 1 subnets
O IA     4.4.4.4 [110/3] via 192.168.12.2, 00:00:54, GigabitEthernet0/1
O IA  192.168.24.0/24 [110/2] via 192.168.12.2, 00:01:44, GigabitEthernet0/1
```

R1은 R3의 루프백(3.3.3.3/32)을 같은 영역(Area 1)에서 배웠으므로 **O**(intra-area)로 표시됩니다. 반면 4.4.4.4/32와 192.168.24.0/24는 R2 너머 Area 2에서 온 것이므로 **O IA**(inter-area)로 표시됩니다.

```
R2#show ip route ospf
      3.0.0.0/32 is subnetted, 1 subnets
O IA     3.3.3.3 [110/3] via 192.168.12.1, 00:02:19, GigabitEthernet0/1
      4.0.0.0/32 is subnetted, 1 subnets
O        4.4.4.4 [110/2] via 192.168.24.4, 00:01:29, GigabitEthernet0/2
O IA  192.168.13.0/24 [110/2] via 192.168.12.1, 00:02:24, GigabitEthernet0/1
```

```
R3#show ip route ospf
      4.0.0.0/32 is subnetted, 1 subnets
O IA     4.4.4.4 [110/4] via 192.168.13.1, 00:01:57, GigabitEthernet0/1
O IA  192.168.12.0/24 [110/2] via 192.168.13.1, 00:02:50, GigabitEthernet0/1
O IA  192.168.24.0/24 [110/3] via 192.168.13.1, 00:02:47, GigabitEthernet0/1
```

R3은 자기 영역(Area 1) 밖에서 학습한 경로밖에 없으므로 전부 **O IA**입니다. R4도 마찬가지입니다:

```
R4#show ip route ospf
      3.0.0.0/32 is subnetted, 1 subnets
O IA     3.3.3.3 [110/4] via 192.168.24.2, 00:02:13, GigabitEthernet0/1
O IA  192.168.12.0/24 [110/2] via 192.168.24.2, 00:02:13, GigabitEthernet0/1
O IA  192.168.13.0/24 [110/3] via 192.168.24.2, 00:02:13, GigabitEthernet0/1
```

메트릭이 홉 수와 그대로 일치하는 이유는 앞서 설명한 대로 Gigabit 인터페이스의 Cost가 전부 1이기 때문입니다. 예를 들어 R3의 4.4.4.4 메트릭 4는 R3→R1(1) + R1→R2(1) + R2→R4(1) + R4 루프백(1) = 4입니다.

마지막으로 R3-R4 간 통신이 실제로 되는지 확인합니다:

```
R3#ping 4.4.4.4 source 3.3.3.3

Type escape sequence to abort.
Sending 5, 100-byte ICMP Echos to 4.4.4.4, timeout is 2 seconds:
Packet sent with a source address of 3.3.3.3
!!!!!
Success rate is 100 percent (5/5), round-trip min/avg/max = 9/11/13 ms
```

핑이 성공했습니다. Area 1과 Area 2는 서로 직접 연결돼 있지 않지만, **Area 0을 거쳐** 통신이 이뤄졌다는 뜻입니다.

## 5. 최종 설정

### R1

```
hostname R1
!
interface GigabitEthernet0/1
 ip address 192.168.12.1 255.255.255.0
!
interface GigabitEthernet0/2
 ip address 192.168.13.1 255.255.255.0
!
router ospf 1
 network 192.168.12.0 0.0.0.255 area 0
 network 192.168.13.0 0.0.0.255 area 1
!
end
```

### R2

```
hostname R2
!
interface GigabitEthernet0/1
 ip address 192.168.12.2 255.255.255.0
!
interface GigabitEthernet0/2
 ip address 192.168.24.2 255.255.255.0
!
router ospf 1
 network 192.168.12.0 0.0.0.255 area 0
 network 192.168.24.0 0.0.0.255 area 2
!
end
```

### R3

```
hostname R3
!
interface Loopback0
 ip address 3.3.3.3 255.255.255.255
!
interface GigabitEthernet0/1
 ip address 192.168.13.3 255.255.255.0
!
router ospf 1
 network 3.3.3.3 0.0.0.0 area 1
 network 192.168.13.0 0.0.0.255 area 1
!
end
```

### R4

```
hostname R4
!
interface Loopback0
 ip address 4.4.4.4 255.255.255.255
!
interface GigabitEthernet0/1
 ip address 192.168.24.4 255.255.255.0
!
router ospf 1
 network 4.4.4.4 0.0.0.0 area 2
 network 192.168.24.0 0.0.0.255 area 2
!
end
```

> 위 원본 최종 설정에는 `router-id` 명령어가 없습니다. R3·R4는 루프백이 있어 자동으로 안정적인 router-id(3.3.3.3, 4.4.4.4)를 갖지만, **R1·R2는 루프백이 없어 인터페이스가 죽거나 재부팅되면 router-id가 바뀔 수 있습니다.** 실습 환경(IOSv)에서는 인터페이스가 전부 `no shutdown`된 상태에서 `router ospf 1`을 실행해야만 router-id 자동 할당이 성공합니다. 순서를 지키지 않으면 앞서 3장에서 언급한 `%OSPF-4-NORTRID` 오류가 발생하므로, 실무·실습 모두에서 R1·R2에도 `router-id`를 수동 지정하는 편이 안전합니다.

## 6. 결론

멀티 에어리어 OSPF를 설정하는 방법과, 라우팅 테이블에서 영역 내(O) 경로와 영역 간(O IA) 경로를 구분하는 방법을 배웠습니다.

- `network` 문의 area 번호로 인터페이스가 속한 영역을 지정하는 방법
- 두 영역에 걸친 라우터가 자동으로 **ABR**이 되는 원리
- `show ip ospf neighbor detail`, `show ip protocols`로 영역 정보를 확인하는 방법
- 영역 간 트래픽은 반드시 **Area 0**을 거친다는 규칙

더 자세한 내용은 [OSPF LSA Types](/posts/06-ospf-lsa-types/)에서 이어집니다.

원본: [OSPF Multi-Area Configuration - NetworkLessons.com](https://networklessons.com/cisco/ccnp-encor-350-401/ospf-multi-area-configuration)
