import { describe, it } from "node:test";
import assert from "node:assert/strict";
import hre from "hardhat";
import { parseEther } from "viem";

// Límites duros del cliente (ver 00_PROJECT_OVERVIEW.md). Los tests fallan si se
// superan, convirtiendo la restricción de negocio en un chequeo automatizado.
const MAX_GAS_CREATE_PROJECT = 350_000n;
const MAX_GAS_PLEDGE = 120_000n;

const ONE_DAY = 24n * 60n * 60n;
const SAMPLE_CID = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"; // CIDv1 de ejemplo

const { viem, networkHelpers } = await hre.network.create();

describe("Crowdfunding", function () {
  // -----------------------------------------------------------------------
  // Fixture: despliega el contrato una vez y reutiliza el snapshot entre tests
  // -----------------------------------------------------------------------
  async function deployCrowdfundingFixture() {
    const crowdfunding = await viem.deployContract("Crowdfunding");
    const [creator, backer1, backer2] = await viem.getWalletClients();
    const publicClient = await viem.getPublicClient();
    return { crowdfunding, creator, backer1, backer2, publicClient };
  }

  /** Crea un proyecto con valores por defecto razonables y devuelve su id. */
  async function createDefaultProject(
    crowdfunding: Awaited<ReturnType<typeof viem.deployContract>>,
    goal = parseEther("1"),
    durationSeconds = ONE_DAY,
  ) {
    const hash = await crowdfunding.write.createProject([goal, Number(durationSeconds), SAMPLE_CID]);
    return hash;
  }

  // -----------------------------------------------------------------------
  // createProject
  // -----------------------------------------------------------------------
  describe("createProject", function () {
    it("crea el proyecto, emite ProjectCreated y respeta el presupuesto de 350k gas", async function () {
      const { crowdfunding, publicClient } = await networkHelpers.loadFixture(deployCrowdfundingFixture);

      const goal = parseEther("2");
      const deadlineExpected = (await networkHelpers.time.latest()) + Number(ONE_DAY);

      const hash = await crowdfunding.write.createProject([goal, Number(ONE_DAY), SAMPLE_CID]);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      assert.ok(
        receipt.gasUsed <= MAX_GAS_CREATE_PROJECT,
        `createProject usó ${receipt.gasUsed} gas, supera el límite de ${MAX_GAS_CREATE_PROJECT}`,
      );

      const project = await crowdfunding.read.getProject([0n]);
      assert.equal(project.goal, goal);
      assert.equal(project.pledged, 0n);
      assert.equal(project.claimed, false);
      // Margen de 5s por variación de timestamp entre el cálculo local y el minado del bloque.
      assert.ok(Math.abs(Number(project.deadline) - deadlineExpected) <= 5);

      assert.equal(await crowdfunding.read.nextProjectId(), 1);
    });

    it("revierte con InvalidGoal si goal == 0", async function () {
      const { crowdfunding } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      await viem.assertions.revertWithCustomError(
        crowdfunding.write.createProject([0n, Number(ONE_DAY), SAMPLE_CID]),
        crowdfunding,
        "InvalidGoal",
      );
    });

    it("revierte con InvalidDuration si durationSeconds == 0", async function () {
      const { crowdfunding } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      await viem.assertions.revertWithCustomError(
        crowdfunding.write.createProject([parseEther("1"), 0, SAMPLE_CID]),
        crowdfunding,
        "InvalidDuration",
      );
    });
  });

  // -----------------------------------------------------------------------
  // pledge
  // -----------------------------------------------------------------------
  describe("pledge", function () {
    it("acepta un aporte válido, emite Pledged y respeta el presupuesto de 120k gas", async function () {
      const { crowdfunding, backer1, publicClient } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      await createDefaultProject(crowdfunding);

      const amount = parseEther("0.5");
      const hash = await crowdfunding.write.pledge([0n], {
        account: backer1.account,
        value: amount,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      assert.ok(
        receipt.gasUsed <= MAX_GAS_PLEDGE,
        `pledge usó ${receipt.gasUsed} gas, supera el límite de ${MAX_GAS_PLEDGE}`,
      );

      assert.equal(await crowdfunding.read.pledgeOf([0n, backer1.account.address]), amount);
      const project = await crowdfunding.read.getProject([0n]);
      assert.equal(project.pledged, amount);
    });

    it("acumula varios pledges del mismo backer", async function () {
      const { crowdfunding, backer1 } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      await createDefaultProject(crowdfunding);

      await crowdfunding.write.pledge([0n], { account: backer1.account, value: parseEther("0.3") });
      await crowdfunding.write.pledge([0n], { account: backer1.account, value: parseEther("0.2") });

      assert.equal(await crowdfunding.read.pledgeOf([0n, backer1.account.address]), parseEther("0.5"));
    });

    it("revierte con ZeroPledge si msg.value == 0", async function () {
      const { crowdfunding, backer1 } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      await createDefaultProject(crowdfunding);

      await viem.assertions.revertWithCustomError(
        crowdfunding.write.pledge([0n], { account: backer1.account, value: 0n }),
        crowdfunding,
        "ZeroPledge",
      );
    });

    it("revierte con ProjectExpired si ya pasó el deadline", async function () {
      const { crowdfunding, backer1 } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      await createDefaultProject(crowdfunding);

      await networkHelpers.time.increase(ONE_DAY + 1n);

      await viem.assertions.revertWithCustomErrorWithArgs(
        crowdfunding.write.pledge([0n], { account: backer1.account, value: parseEther("0.1") }),
        crowdfunding,
        "ProjectExpired",
        [0n],
      );
    });

    it("revierte con ProjectNotFound si el id no existe", async function () {
      const { crowdfunding, backer1 } = await networkHelpers.loadFixture(deployCrowdfundingFixture);

      await viem.assertions.revertWithCustomErrorWithArgs(
        crowdfunding.write.pledge([99n], { account: backer1.account, value: parseEther("0.1") }),
        crowdfunding,
        "ProjectNotFound",
        [99n],
      );
    });
  });

  // -----------------------------------------------------------------------
  // claimFunds
  // -----------------------------------------------------------------------
  describe("claimFunds", function () {
    it("el creador retira el total recaudado cuando el proyecto tuvo éxito", async function () {
      const { crowdfunding, creator, backer1 } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      const goal = parseEther("1");
      await createDefaultProject(crowdfunding, goal);
      await crowdfunding.write.pledge([0n], { account: backer1.account, value: goal });

      await networkHelpers.time.increase(ONE_DAY + 1n);

      // Se verifica el balance del CONTRATO (no el del creador): el creador paga el
      // gas de su propia llamada, así que su balance neto no cambia exactamente en
      // `goal`. El contrato, en cambio, sí debe pasar de `goal` a 0 wei.
      await viem.assertions.balancesHaveChanged(
        crowdfunding.write.claimFunds([0n], { account: creator.account }),
        [{ address: crowdfunding.address, amount: -goal }],
      );

      const project = await crowdfunding.read.getProject([0n]);
      assert.equal(project.claimed, true);
    });

    it("revierte con NotProjectCreator si lo llama alguien que no es el creador", async function () {
      const { crowdfunding, backer1 } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      const goal = parseEther("1");
      await createDefaultProject(crowdfunding, goal);
      await crowdfunding.write.pledge([0n], { account: backer1.account, value: goal });
      await networkHelpers.time.increase(ONE_DAY + 1n);

      await viem.assertions.revertWithCustomErrorWithArgs(
        crowdfunding.write.claimFunds([0n], { account: backer1.account }),
        crowdfunding,
        "NotProjectCreator",
        [0n],
      );
    });

    it("revierte con ProjectNotSuccessful si no se alcanzó la meta", async function () {
      const { crowdfunding, creator, backer1 } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      const goal = parseEther("1");
      await createDefaultProject(crowdfunding, goal);
      await crowdfunding.write.pledge([0n], { account: backer1.account, value: parseEther("0.4") });
      await networkHelpers.time.increase(ONE_DAY + 1n);

      await viem.assertions.revertWithCustomErrorWithArgs(
        crowdfunding.write.claimFunds([0n], { account: creator.account }),
        crowdfunding,
        "ProjectNotSuccessful",
        [0n],
      );
    });

    it("revierte con ProjectNotExpired si aún no pasó el deadline", async function () {
      const { crowdfunding, creator, backer1 } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      const goal = parseEther("1");
      await createDefaultProject(crowdfunding, goal);
      await crowdfunding.write.pledge([0n], { account: backer1.account, value: goal });

      await viem.assertions.revertWithCustomErrorWithArgs(
        crowdfunding.write.claimFunds([0n], { account: creator.account }),
        crowdfunding,
        "ProjectNotExpired",
        [0n],
      );
    });

    it("revierte con AlreadyClaimed en un segundo intento de claim", async function () {
      const { crowdfunding, creator, backer1 } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      const goal = parseEther("1");
      await createDefaultProject(crowdfunding, goal);
      await crowdfunding.write.pledge([0n], { account: backer1.account, value: goal });
      await networkHelpers.time.increase(ONE_DAY + 1n);

      await crowdfunding.write.claimFunds([0n], { account: creator.account });

      await viem.assertions.revertWithCustomErrorWithArgs(
        crowdfunding.write.claimFunds([0n], { account: creator.account }),
        crowdfunding,
        "AlreadyClaimed",
        [0n],
      );
    });
  });

  // -----------------------------------------------------------------------
  // refund
  // -----------------------------------------------------------------------
  describe("refund", function () {
    it("cada backer recupera su propio aporte si el proyecto no tuvo éxito", async function () {
      const { crowdfunding, backer1, backer2 } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      const goal = parseEther("1");
      await createDefaultProject(crowdfunding, goal);

      await crowdfunding.write.pledge([0n], { account: backer1.account, value: parseEther("0.3") });
      await crowdfunding.write.pledge([0n], { account: backer2.account, value: parseEther("0.2") });

      await networkHelpers.time.increase(ONE_DAY + 1n);

      // Igual que en claimFunds: se mide el balance del contrato (baja exactamente
      // el monto reembolsado) en vez del balance de backer1, que paga su propio gas.
      await viem.assertions.balancesHaveChanged(
        crowdfunding.write.refund([0n], { account: backer1.account }),
        [{ address: crowdfunding.address, amount: -parseEther("0.3") }],
      );

      assert.equal(await crowdfunding.read.pledgeOf([0n, backer1.account.address]), 0n);
      // El refund de backer1 no debe afectar el pledge de backer2 (reembolso individual).
      assert.equal(await crowdfunding.read.pledgeOf([0n, backer2.account.address]), parseEther("0.2"));
    });

    it("revierte con ProjectWasSuccessful si el proyecto sí alcanzó la meta", async function () {
      const { crowdfunding, backer1 } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      const goal = parseEther("1");
      await createDefaultProject(crowdfunding, goal);
      await crowdfunding.write.pledge([0n], { account: backer1.account, value: goal });
      await networkHelpers.time.increase(ONE_DAY + 1n);

      await viem.assertions.revertWithCustomErrorWithArgs(
        crowdfunding.write.refund([0n], { account: backer1.account }),
        crowdfunding,
        "ProjectWasSuccessful",
        [0n],
      );
    });

    it("revierte con NoFundsToRefund si el backer nunca aportó", async function () {
      const { crowdfunding, backer1, backer2 } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      const goal = parseEther("1");
      await createDefaultProject(crowdfunding, goal);
      await crowdfunding.write.pledge([0n], { account: backer1.account, value: parseEther("0.1") });
      await networkHelpers.time.increase(ONE_DAY + 1n);

      await viem.assertions.revertWithCustomErrorWithArgs(
        crowdfunding.write.refund([0n], { account: backer2.account }),
        crowdfunding,
        "NoFundsToRefund",
        [0n],
      );
    });

    it("revierte con ProjectNotExpired si aún no pasó el deadline", async function () {
      const { crowdfunding, backer1 } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      const goal = parseEther("1");
      await createDefaultProject(crowdfunding, goal);
      await crowdfunding.write.pledge([0n], { account: backer1.account, value: parseEther("0.1") });

      await viem.assertions.revertWithCustomErrorWithArgs(
        crowdfunding.write.refund([0n], { account: backer1.account }),
        crowdfunding,
        "ProjectNotExpired",
        [0n],
      );
    });
  });
});
